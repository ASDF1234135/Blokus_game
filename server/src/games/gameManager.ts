import { Server, Socket } from 'socket.io';
import { pieces } from '@game1000/common';
import type { GameState, PlacedPiece, GameType } from '@game1000/common/types';
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
} from './blokus/game.js';

const games: Map<string, GameState> = new Map();
const playerToGame: Map<string, string> = new Map();

export class GameManager {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(socket: Socket) {
    console.log(`User connected: ${socket.id}`);

    socket.on('createGame', (gameType: GameType) => this.createGame(socket, gameType));
    socket.on('joinGame', (gameId: string) => this.joinGame(socket, gameId));
    socket.on('playerReady', (isReady: boolean) => this.handlePlayerReady(socket, isReady));
    socket.on('startGame', () => this.handleStartGame(socket));
    socket.on('placePiece', (placedPiece: PlacedPiece) => this.handlePlacePiece(socket, placedPiece));
    socket.on('passTurn', () => this.handlePassTurn(socket));
    socket.on('playAgainRequest', () => this.handlePlayAgainRequest(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private createGame(socket: Socket, gameType: GameType) {
    const gameId = Math.random().toString(36).substring(2, 7);
    const gameState = createInitialState(gameType);
    games.set(gameId, gameState);
    this.joinGame(socket, gameId);
  }

  private joinGame(socket: Socket, gameId: string) {
    const gameState = games.get(gameId);
    const maxPlayers = gameState?.gameType === '2-player' ? 2 : gameState?.gameType === '3-player' ? 3 : 4;
    if (!gameState || gameState.status !== 'lobby' || gameState.players.length >= maxPlayers) {
      socket.emit('error', 'Game is full, in progress, or does not exist.');
      return;
    }

    socket.join(gameId);
    playerToGame.set(socket.id, gameId);
    
    const newGameState = addPlayer(gameState, socket.id);
    this.updateGameState(gameId, newGameState);

    socket.emit('gameJoined', { gameId, playerId: socket.id });
  }

  private handlePlayerReady(socket: Socket, isReady: boolean) {
    const gameId = playerToGame.get(socket.id);
    if (gameId) {
      const gameState = games.get(gameId);
      if (gameState) {
        const newGameState = setPlayerReady(gameState, socket.id, isReady);
        this.updateGameState(gameId, newGameState);
      }
    }
  }

  private handleStartGame(socket: Socket) {
    const gameId = playerToGame.get(socket.id);
    if (gameId) {
      const gameState = games.get(gameId);
      if (gameState) {
        const newGameState = startGame(gameState, socket.id);
        this.updateGameState(gameId, newGameState);
      }
    }
  }

  private handlePlacePiece(socket: Socket, placedPiece: PlacedPiece) {
    const gameId = playerToGame.get(socket.id);
    if (gameId) {
      const gameState = games.get(gameId);
      if (gameState && gameState.status === 'in-progress') {
        const newGameState = placePiece(gameState, socket.id, placedPiece);
        this.updateGameState(gameId, newGameState);
      }
    }
  }

  private handlePassTurn(socket: Socket) {
    const gameId = playerToGame.get(socket.id);
    if (gameId) {
      const gameState = games.get(gameId);
      if (gameState && gameState.status === 'in-progress') {
        const newGameState = passTurn(gameState, socket.id);
        this.updateGameState(gameId, newGameState);
      }
    }
  }

  private handlePlayAgainRequest(socket: Socket) {
    const gameId = playerToGame.get(socket.id);
    if (gameId) {
      const gameState = games.get(gameId);
      if (gameState && gameState.status === 'finished') {
        const stateWithPlayerReady = setWantsToPlayAgain(gameState, socket.id);
        const finalState = resetGame(stateWithPlayerReady);
        this.updateGameState(gameId, finalState);
      }
    }
  }

  private updateGameState(gameId: string, gameState: GameState) {
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
      games.set(gameId, finalState);
      this.io.to(gameId).emit('gameState', finalState);
    } else {
      games.set(gameId, gameState);
      this.io.to(gameId).emit('gameState', gameState);
    }
  }

  private handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
    const gameId = playerToGame.get(socket.id);
    if (gameId) {
      playerToGame.delete(socket.id);
    }
  }
}
