import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameManager } from './games/gameManager.js';

const app = express();
const server = http.createServer(app);
const allowedOrigins = ['http://localhost:5173'];
const clientOrigin = process.env.CLIENT_ORIGIN;
if (clientOrigin) {
  allowedOrigins.push(clientOrigin);
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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
