import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameManager } from './games/gameManager.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  },
});

app.get('/', (req, res) => {
  res.send('Game Server is Running!');
});

// Instantiate the GameManager to handle all game logic and connections
new GameManager(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
