Central Server (central-server.js) - WebSocket server that relays messages between miners
Miner Server (miner.js) - Full blockchain implementation with:

Block creation and proof-of-work mining
Transaction validation and balance checking
Chain validation and consensus (longest valid chain wins)
Automatic blockchain synchronization on startup
Rejection of invalid blocks and shorter chains
Key Features:
✅ Proof of Work: Miners must find hashes starting with "000" (difficulty = 3)
✅ Block Validation: Checks hash integrity, chain linkage, and transaction validity
✅ Balance Verification: Prevents overspending
✅ Chain Synchronization: New miners automatically catch up to the network
✅ Longest Chain Rule: Only accepts longer valid chains (consensus)
✅ Mining Rewards: 50 coins per mined block
✅ Transaction Broadcasting: Transactions propagate to all miners


# Terminal 1: Central server
   npm run server
   
   # Terminal 2-3: Miners
   node miner.js miner1
   node miner.js miner2
