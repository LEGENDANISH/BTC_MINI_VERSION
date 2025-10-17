const WebSocket = require('ws');
const crypto = require('crypto');

class Block{
    constructor(index,timestamp,transactions,previousHash , nonce=0){
        this.index=index;
        this.timestamp=timestamp;
        this.transactions=transactions;
        this.previousHash=previousHash;
        this.nonce=nonce;
        this.hash=this.calculateHash(); 
    }
    calculateHash(){
        return crypto 
        .createHash('sha256')
        .update(
            this.index +
            this.timestamp +
            JSON.stringify(this.transactions)+
            this.previousHash +
            this.nonce
        )
        .digest('hex');
    }

mineBlock(difficulty){
    const target = '0'.repeat(difficulty);
    while(this.hash.substring(0,difficulty)!==target){
        this.nonce++;
        this.hash = this.calculateHash();

    }
    console.log(`Block mined: ${this.hash}`);
} 
}

class Transactions {
    constructor(from , to ,amount){
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.timestamp = Date.now();
    }
    calculateHash(){
        return crypto
        .createHash('sha256')
        .update(this.from + this.to + this.amount + this.timestamp)
        .digest('hex');
    }
    signTranscation(signingKey){
        if(signingKey/getPublic('hex')!== this.from){
            throw new Error('Ypi cannot sign transactions for other wallets');
        }
        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx,'base64');
        this.signature = sig.toDER('hex');
    }
    isValid(){
        if(this.from === null)return true;
        if(!this.signature || this.signature.length ===0){
            throw new Error('No signature in this transaction');
        }
        return true;
    }
}

class Blockchain{
    cconstructor(){
        this.chain =[this.createGenesisBloack()];
        this.difficulty = 3;
        this.pendingTransactions = [];
        this.miningReward = 50;
    }
    createGenesisBloack(){
        return new Block(0,Date.now(),[],'0');

    }
    getLatestBlock(){
        return this.chain[this.chain.length -1];

    }
    addTransaction(transaction){
        if(!transaction.from || !transaction.to){
            throw new Error('Transaction must include from and to address');
        }
        if(!transaction.isValid()){
            throw new Error('Cannot add invalid transaction to chain');
        }


        const balance = this.getBalanceOfAddress(transaction.from);
        if(balance<transaction.amount){
            throw new Error('Not enough balance');

        }
        this.pendingTransactions.push(transaction);

    }
    minePendingTransactions(miningRewardAddress){
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
    getBalanceOfAddress(address){
        let balance = 0;
        
        for(const bloack of this.chain){
            for(const trans of block.transactions){
                if(trans.from === address){
                    balance -= trans.amount;

                }
                if(trans.to === address){
                    balance += trans.amount;
                }
            }
        }
        return balance;

    }
    isChainValid(){
        for(let i = 1;i<this.chain.length;i++){
            const currentBlock = chain[i];
            const previousBlock = chain[i-1];

            for(const trans of currentBlock.transactions){
                if(!trans.isValid()){
                    return false;
                }
            }

            //check if hash is correct
            if(currentBlock.hash !== currentBlock.calculateHash()){
                
            }

    }
}

