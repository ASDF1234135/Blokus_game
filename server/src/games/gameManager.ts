import { Server, Socket } from 'socket.io';
import { pieces } from '@game1000/common';
import type { GameState, PlacedPiece, GameType } from '@game1000/common/types';
import Redis from 'ioredis';
import {
  createInitialState,
  addPlayer,
  placePiece,
  passTurn,
  setPlayerReady,
  startGame,
  isGameOver,
  setWantsToPlayAgain,
  resetGame,
  removePlayer,
} from './blokus/game.js';

const redis = new Redis(process.env.REDIS_URL!);
const playerSocket: Map<string, string> = new Map();

// Helper functions to interact with Redis
async function getGame(gameId: string): Promise<GameState | null> {
  const gameStateJson = await redis.get(`game:${gameId}`);
  return gameStateJson ? JSON.parse(gameStateJson) : null;
}

async function setGame(gameId: string, gameState: GameState): Promise<void> {
  await redis.set(`game:${gameId}`, JSON.stringify(gameState));
}

async function getPlayerGame(playerId: string): Promise<string | null> {
    return await redis.get(`player:${playerId}`);
}

async function setPlayerGame(playerId: string, gameId: string): Promise<void> {
    await redis.set(`player:${playerId}`, gameId);
}

async function deletePlayerGame(playerId: string): Promise<void> {
    await redis.del(`player:${playerId}`);
}

async function deleteGame(gameId: string): Promise<void> {
    await redis.del(`game:${gameId}`);
}


export class GameManager {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.io.on('connection', this.handleConnection.bind(this));
    this.startCleanupLoop();
  }

  private startCleanupLoop() {
    setInterval(async () => {
        const gameKeys = await redis.keys('game:*');
        for (const key of gameKeys) {
            const gameId = key.replace('game:', '');
            const gameState = await getGame(gameId);
            if (!gameState) continue;

            const timedOutPlayers = gameState.players.filter(p => 
                p.status === 'disconnected' && Date.now() - (p.disconnectedAt || 0) > 60000
            );

            if (timedOutPlayers.length > 0) {
                let currentGameState = gameState;
                for (const player of timedOutPlayers) {
                    currentGameState = removePlayer(currentGameState, player.id);
                }

                if (currentGameState.players.length < 2) {
                    this.io.to(gameId).emit('gameEnded', 'The game has ended because a player was disconnected for too long.');
                    await deleteGame(gameId);
                    for (const p of currentGameState.players) {
                        await deletePlayerGame(p.id);
                    }
                } else {
                    await this.updateGameState(gameId, currentGameState);
                }
            }
        }
    }, 15000);
  }

  private handleConnection(socket: Socket) {
    console.log(`User connected: ${socket.id}`);

    socket.on('createGame', ({ gameType, playerId }: { gameType: GameType; playerId: string }) => this.createGame(socket, gameType, playerId));
    socket.on('joinGame', ({ gameId, playerId }: { gameId: string; playerId: string }) => this.joinGame(socket, gameId, playerId));
    socket.on('rejoinGame', ({ gameId, playerId }: { gameId: string; playerId: string }) => this.rejoinGame(socket, gameId, playerId));
    socket.on('playerReady', (isReady: boolean) => this.handlePlayerReady(socket, isReady));
    socket.on('startGame', () => this.handleStartGame(socket));
    socket.on('placePiece', (placedPiece: PlacedPiece) => this.handlePlacePiece(socket, placedPiece));
    socket.on('passTurn', () => this.handlePassTurn(socket));
    socket.on('playAgainRequest', () => this.handlePlayAgainRequest(socket));
    socket.on('leaveLobby', () => this.handleLeaveLobby(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private async handleLeaveLobby(socket: Socket) {
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;

    const gameId = await getPlayerGame(playerId);
    if (!gameId) return;

    const gameState = await getGame(gameId);
    if (!gameState || gameState.status !== 'lobby') return;

    const newGameState = removePlayer(gameState, playerId);
    
    await deletePlayerGame(playerId);
    playerSocket.delete(playerId);

    await this.updateGameState(gameId, newGameState);

    socket.emit('gameLeft');
    socket.leave(gameId);
  }

  private handleDuplicateConnection(playerId: string, newSocket: Socket) {
    const oldSocketId = playerSocket.get(playerId);
    if (oldSocketId && oldSocketId !== newSocket.id) {
        const oldSocket = this.io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
            oldSocket.emit('duplicateConnection');
            oldSocket.disconnect(true);
        }
    }
  }

  private async createGame(socket: Socket, gameType: GameType, playerId: string) {
    const gameId = Math.random().toString(36).substring(2, 7);
    const gameState = createInitialState(gameType);
    await setGame(gameId, gameState);
    this.joinGame(socket, gameId, playerId);
  }

  private async joinGame(socket: Socket, gameId: string, playerId: string) {
    this.handleDuplicateConnection(playerId, socket);
    const gameState = await getGame(gameId);
    const maxPlayers = gameState?.gameType === '2-player' ? 2 : gameState?.gameType === '3-player' ? 3 : 4;
    if (!gameState || gameState.status !== 'lobby' || gameState.players.length >= maxPlayers) {
      socket.emit('error', 'Game is full, in progress, or does not exist.');
      return;
    }

    socket.join(gameId);
    await setPlayerGame(playerId, gameId);
    playerSocket.set(playerId, socket.id);
    
    const newGameState = addPlayer(gameState, playerId);
    await this.updateGameState(gameId, newGameState);

    socket.emit('gameJoined', { gameId, playerId });
  }

  private async rejoinGame(socket: Socket, gameId: string, playerId: string) {
    console.log(`Attempting to rejoin player ${playerId} to game ${gameId}`);
    this.handleDuplicateConnection(playerId, socket);

    const gameState = await getGame(gameId);
    console.log('Found gameState:', !!gameState);

    if (!gameState) {
      socket.emit('error', 'Could not find a game to rejoin.');
      return;
    }

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    console.log('Found player in game at index:', playerIndex);

    if (playerIndex !== -1) {
      socket.join(gameId);
      await setPlayerGame(playerId, gameId);
      playerSocket.set(playerId, socket.id);

      // --- IMMUTABILITY FIX ---
      // Create a new player object with the updated status
      const updatedPlayer = { 
        ...gameState.players[playerIndex], 
        status: 'online' as const,
        disconnectedAt: undefined,
      };

      // Create a new players array
      const newPlayers = [
        ...gameState.players.slice(0, playerIndex),
        updatedPlayer,
        ...gameState.players.slice(playerIndex + 1),
      ];

      // Create a new game state object
      const newGameState = { ...gameState, players: newPlayers };
      // --- END FIX ---
      
      console.log(`Player ${playerId} reconnected successfully.`);

      await this.updateGameState(gameId, newGameState);

      socket.emit('gameJoined', { gameId, playerId });
      socket.emit('gameState', newGameState);
    } else {
      console.log(`Player ${playerId} not found in game ${gameId}.`);
      socket.emit('error', 'Could not rejoin game. Player not found.');
    }
  }

  private async handlePlayerReady(socket: Socket, isReady: boolean) {
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;
    const gameId = await getPlayerGame(playerId);

    if (gameId) {
      const gameState = await getGame(gameId);
      if (gameState) {
        const newGameState = setPlayerReady(gameState, playerId, isReady);
        await this.updateGameState(gameId, newGameState);
      }
    }
  }

  private async handleStartGame(socket: Socket) {
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;
    const gameId = await getPlayerGame(playerId);

    if (gameId) {
      const gameState = await getGame(gameId);
      if (gameState) {
        const newGameState = startGame(gameState, playerId);
        await this.updateGameState(gameId, newGameState);
      }
    }
  }

  private async handlePlacePiece(socket: Socket, placedPiece: PlacedPiece) {
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;
    const gameId = await getPlayerGame(playerId);

    if (gameId) {
      const gameState = await getGame(gameId);
      if (gameState && gameState.status === 'in-progress') {
        const newGameState = placePiece(gameState, playerId, placedPiece);
        await this.updateGameState(gameId, newGameState);
      }
    }
  }

  private async handlePassTurn(socket: Socket) {
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;
    const gameId = await getPlayerGame(playerId);

    if (gameId) {
      const gameState = await getGame(gameId);
      if (gameState && gameState.status === 'in-progress') {
        const newGameState = passTurn(gameState, playerId);
        await this.updateGameState(gameId, newGameState);
      }
    }
  }

  private async handlePlayAgainRequest(socket: Socket) {
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;
    const gameId = await getPlayerGame(playerId);

    if (gameId) {
      const gameState = await getGame(gameId);
      if (gameState && gameState.status === 'finished') {
        const stateWithPlayerReady = setWantsToPlayAgain(gameState, playerId);
        const finalState = resetGame(stateWithPlayerReady);
        await this.updateGameState(gameId, finalState);
      }
    }
  }

  private async updateGameState(gameId: string, gameState: GameState) {
    if (gameState.status === 'in-progress' && isGameOver(gameState)) {
      const newColors = gameState.colors.map((c) => {
        let score = 0;
        for (const pieceName of c.pieces) {
          score -= pieces[pieceName].flat().reduce((sum: number, cell: number) => sum + cell, 0);
        }
        if (c.pieces.length === 0) {
          score += 15;
        }
        return { ...c, score };
      });

      const finalState: GameState = {
        ...gameState,
        status: 'finished',
        colors: newColors,
      };
      await setGame(gameId, finalState);
      this.io.to(gameId).emit('gameState', finalState);
    } else {
      await setGame(gameId, gameState);
      this.io.to(gameId).emit('gameState', gameState);
    }
  }

  private async handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
    const playerId = [...playerSocket.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (!playerId) return;
    
    playerSocket.delete(playerId);
    const gameId = await getPlayerGame(playerId);

    if (gameId) {
      const gameState = await getGame(gameId);
      if (gameState && gameState.status !== 'lobby') {
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
            player.status = 'disconnected';
            player.disconnectedAt = Date.now();
            await this.updateGameState(gameId, gameState);
        }
      }
    }
  }
}
