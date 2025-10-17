// central-server.js
const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

const miners = new Set();

console.log(`Central server started on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('New miner connected');
  miners.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message type: ${data.type}`);

      // Broadcast to all other miners
      miners.forEach((miner) => {
        if (miner !== ws && miner.readyState === WebSocket.OPEN) {
          miner.send(message);
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Miner disconnected');
    miners.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  wss.close(() => {
    process.exit(0);
  });
});