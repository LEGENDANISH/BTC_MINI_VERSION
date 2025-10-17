const WebSocket = require('ws');
const crypto = require('crypto');

class Block {
  constructor(index, timestamp, transactions, previousHash, nonce = 0) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.previousHash +
        this.nonce
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }
}

class Transaction {
  constructor(from, to, amount) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.timestamp = Date.now();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.from + this.to + this.amount + this.timestamp)
      .digest('hex');
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.from) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  isValid() {
    if (this.from === null) return true;
    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }
    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 3;
    this.pendingTransactions = [];
    this.miningReward = 50;
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction) {
    if (!transaction.from || !transaction.to) {
      throw new Error('Transaction must include from and to address');
    }
    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }
    const balance = this.getBalanceOfAddress(transaction.from);
    if (balance < transaction.amount) {
      throw new Error('Not enough balance');
    }
    this.pendingTransactions.push(transaction);
  }

  minePendingTransactions(miningRewardAddress) {
    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );

    block.mineBlock(this.difficulty);
    this.chain.push(block);

    this.pendingTransactions = [];
    return block;
  }

  getBalanceOfAddress(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.from === address) balance -= trans.amount;
        if (trans.to === address) balance += trans.amount;
      }
    }
    return balance;
  }

  isChainValid(chain = this.chain) {
    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];

      for (const trans of currentBlock.transactions) {
        if (!trans.isValid()) return false;
      }
      if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
      if (!currentBlock.hash.startsWith('0'.repeat(this.difficulty))) return false;
    }
    return true;
  }

  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      console.log('Received chain is not longer than current chain');
      return false;
    }
    if (!this.isChainValid(newChain)) {
      console.log('Received chain is invalid');
      return false;
    }
    console.log('Replacing current chain with new chain');
    this.chain = newChain;
    return true;
  }
}

class Miner {
  constructor(serverUrl, minerAddress) {
    this.blockchain = new Blockchain();
    this.serverUrl = serverUrl;
    this.minerAddress = minerAddress;
    this.ws = null;
    this.isConnected = false;
  }

  connect() {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      console.log('Connected to central server');
      this.isConnected = true;
      this.requestBlockchain();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data));
    });

    this.ws.on('close', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'NEW_BLOCK':
        this.handleNewBlock(message.block);
        break;
      case 'REQUEST_BLOCKCHAIN':
        this.sendBlockchain();
        break;
      case 'BLOCKCHAIN':
        this.handleBlockchain(message.chain);
        break;
      case 'NEW_TRANSACTION':
        this.handleNewTransaction(message.transaction);
        break;
    }
  }

  reconstructTransaction(txData) {
    const tx = new Transaction(txData.from, txData.to, txData.amount);
    tx.timestamp = txData.timestamp;
    tx.signature = txData.signature;
    return tx;
  }

  reconstructBlock(blockData) {
    const transactions = blockData.transactions.map(txData =>
      this.reconstructTransaction(txData)
    );
    const block = new Block(
      blockData.index,
      blockData.timestamp,
      transactions,
      blockData.previousHash,
      blockData.nonce
    );
    block.hash = blockData.hash;
    return block;
  }

  handleNewBlock(blockData) {
    const block = this.reconstructBlock(blockData);
    if (block.index !== this.blockchain.chain.length) {
      console.log('Block index mismatch, requesting full chain');
      this.requestBlockchain();
      return;
    }
    if (block.previousHash !== this.blockchain.getLatestBlock().hash) {
      console.log('Invalid previous hash, requesting full chain');
      this.requestBlockchain();
      return;
    }
    if (block.hash !== block.calculateHash()) {
      console.log('Invalid block hash');
      return;
    }
    if (!block.hash.startsWith('0'.repeat(this.blockchain.difficulty))) {
      console.log('Block does not meet difficulty requirement');
      return;
    }
    console.log('Received valid block, adding to chain');
    this.blockchain.chain.push(block);
  }

  handleBlockchain(chainData) {
    const newChain = chainData.map(blockData => this.reconstructBlock(blockData));
    if (this.blockchain.replaceChain(newChain)) {
      console.log('Blockchain updated from network');
    }
  }

  handleNewTransaction(transactionData) {
    try {
      const transaction = new Transaction(
        transactionData.from,
        transactionData.to,
        transactionData.amount
      );
      transaction.timestamp = transactionData.timestamp;
      transaction.signature = transactionData.signature;
      this.blockchain.addTransaction(transaction);
      console.log('Added new transaction to pending pool');
    } catch (error) {
      console.error('Error adding transaction:', error.message);
    }
  }

  requestBlockchain() {
    if (this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'REQUEST_BLOCKCHAIN' }));
    }
  }

  sendBlockchain() {
    if (this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'BLOCKCHAIN',
        chain: this.blockchain.chain
      }));
    }
  }

  broadcastBlock(block) {
    if (this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'NEW_BLOCK',
        block: block
      }));
    }
  }

  broadcastTransaction(transaction) {
    if (this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'NEW_TRANSACTION',
        transaction: transaction
      }));
    }
  }

  startMining() {
    console.log(`Miner ${this.minerAddress} started`);
    setInterval(() => {
      if (this.blockchain.pendingTransactions.length > 0 || Math.random() > 0.7) {
        console.log('\nStarting mining...');
        const block = this.blockchain.minePendingTransactions(this.minerAddress);
        console.log(`Balance: ${this.blockchain.getBalanceOfAddress(this.minerAddress)}`);
        this.broadcastBlock(block);
      }
    }, 10000);
  }

  createTransaction(to, amount) {
    try {
      const transaction = new Transaction(this.minerAddress, to, amount);
      this.blockchain.addTransaction(transaction);
      this.broadcastTransaction(transaction);
      console.log('Transaction created and broadcast');
    } catch (error) {
      console.error('Error creating transaction:', error.message);
    }
  }

  getBalance() {
    return this.blockchain.getBalanceOfAddress(this.minerAddress);
  }

  printBlockchain() {
    console.log('\n--- Blockchain ---');
    console.log(JSON.stringify(this.blockchain.chain, null, 2));
    console.log(`Chain is valid: ${this.blockchain.isChainValid()}`);
  }
}

const CENTRAL_SERVER = 'ws://localhost:8080';
const MINER_ADDRESS = process.argv[2] || `miner-${Math.random().toString(36).substr(2, 9)}`;

const miner = new Miner(CENTRAL_SERVER, MINER_ADDRESS);
miner.connect();

setTimeout(() => {
  miner.startMining();
}, 3000);

process.stdin.setEncoding('utf8');
console.log('\nCommands:');
console.log('  balance - Check your balance');
console.log('  send <address> <amount> - Send coins');
console.log('  print - Print blockchain');
console.log('  quit - Exit\n');

process.stdin.on('data', (input) => {
  const parts = input.trim().split(' ');
  const command = parts[0];
  switch (command) {
    case 'balance':
      console.log(`Balance: ${miner.getBalance()}`);
      break;
    case 'send':
      if (parts.length === 3) {
        miner.createTransaction(parts[1], parseFloat(parts[2]));
      } else {
        console.log('Usage: send <address> <amount>');
      }
      break;
    case 'print':
      miner.printBlockchain();
      break;
    case 'quit':
      process.exit(0);
      break;
    default:
      console.log('Unknown command');
  }
});
