import { pieces } from '@game1000/common';
import { createInitialState, addPlayer, placePiece, passTurn, setPlayerReady, startGame, isGameOver, setWantsToPlayAgain, resetGame, } from './blokus/game.js';
const games = new Map();
const playerToGame = new Map();
export class GameManager {
    constructor(io) {
        this.io = io;
        this.io.on('connection', this.handleConnection.bind(this));
    }
    handleConnection(socket) {
        console.log(`User connected: ${socket.id}`);
        socket.on('createGame', () => this.createGame(socket));
        socket.on('joinGame', (gameId) => this.joinGame(socket, gameId));
        socket.on('playerReady', (isReady) => this.handlePlayerReady(socket, isReady));
        socket.on('startGame', () => this.handleStartGame(socket));
        socket.on('placePiece', (placedPiece) => this.handlePlacePiece(socket, placedPiece));
        socket.on('passTurn', () => this.handlePassTurn(socket));
        socket.on('playAgainRequest', () => this.handlePlayAgainRequest(socket));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }
    createGame(socket) {
        const gameId = Math.random().toString(36).substring(2, 7);
        const gameState = createInitialState();
        games.set(gameId, gameState);
        this.joinGame(socket, gameId);
    }
    joinGame(socket, gameId) {
        const gameState = games.get(gameId);
        if (!gameState || gameState.status !== 'lobby' || gameState.players.length >= 4) {
            socket.emit('error', 'Game is full, in progress, or does not exist.');
            return;
        }
        socket.join(gameId);
        playerToGame.set(socket.id, gameId);
        const newGameState = addPlayer(gameState, socket.id);
        this.updateGameState(gameId, newGameState);
        socket.emit('gameJoined', { gameId, playerId: socket.id });
    }
    handlePlayerReady(socket, isReady) {
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            const gameState = games.get(gameId);
            if (gameState) {
                const newGameState = setPlayerReady(gameState, socket.id, isReady);
                this.updateGameState(gameId, newGameState);
            }
        }
    }
    handleStartGame(socket) {
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            const gameState = games.get(gameId);
            if (gameState) {
                const newGameState = startGame(gameState, socket.id);
                this.updateGameState(gameId, newGameState);
            }
        }
    }
    handlePlacePiece(socket, placedPiece) {
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            const gameState = games.get(gameId);
            if (gameState && gameState.status === 'in-progress') {
                const newGameState = placePiece(gameState, socket.id, placedPiece);
                this.updateGameState(gameId, newGameState);
            }
        }
    }
    handlePassTurn(socket) {
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            const gameState = games.get(gameId);
            if (gameState && gameState.status === 'in-progress') {
                const newGameState = passTurn(gameState, socket.id);
                this.updateGameState(gameId, newGameState);
            }
        }
    }
    handlePlayAgainRequest(socket) {
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
    updateGameState(gameId, gameState) {
        if (gameState.status === 'in-progress' && isGameOver(gameState)) {
            const finalState = Object.assign(Object.assign({}, gameState), { status: 'finished', players: gameState.players.map((p) => {
                    let score = 0;
                    for (const pieceName of p.pieces) {
                        score -= pieces[pieceName].flat().reduce((sum, cell) => sum + cell, 0);
                    }
                    if (p.pieces.length === 0) {
                        score += 15;
                    }
                    return Object.assign(Object.assign({}, p), { score });
                }) });
            games.set(gameId, finalState);
            this.io.to(gameId).emit('gameState', finalState);
        }
        else {
            games.set(gameId, gameState);
            this.io.to(gameId).emit('gameState', gameState);
        }
    }
    handleDisconnect(socket) {
        console.log(`User disconnected: ${socket.id}`);
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            playerToGame.delete(socket.id);
        }
    }
}
