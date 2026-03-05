var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { pieces } from '@game1000/common';
import Redis from 'ioredis';
import { createInitialState, addPlayer, placePiece, passTurn, setPlayerReady, startGame, isGameOver, setWantsToPlayAgain, resetGame, removePlayer, } from './blokus/game.js';
const redis = new Redis(process.env.REDIS_URL);
const playerSocket = new Map();
// Helper functions to interact with Redis
function getGame(gameId) {
    return __awaiter(this, void 0, void 0, function* () {
        const gameStateJson = yield redis.get(`game:${gameId}`);
        return gameStateJson ? JSON.parse(gameStateJson) : null;
    });
}
function setGame(gameId, gameState) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.set(`game:${gameId}`, JSON.stringify(gameState));
    });
}
function getPlayerGame(playerId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield redis.get(`player:${playerId}`);
    });
}
function setPlayerGame(playerId, gameId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.set(`player:${playerId}`, gameId);
    });
}
function deletePlayerGame(playerId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.del(`player:${playerId}`);
    });
}
function deleteGame(gameId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.del(`game:${gameId}`);
    });
}
export class GameManager {
    constructor(io) {
        this.io = io;
        this.io.on('connection', this.handleConnection.bind(this));
        this.startCleanupLoop();
    }
    startCleanupLoop() {
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const gameKeys = yield redis.keys('game:*');
            for (const key of gameKeys) {
                const gameId = key.replace('game:', '');
                const gameState = yield getGame(gameId);
                if (!gameState)
                    continue;
                const timedOutPlayers = gameState.players.filter(p => p.status === 'disconnected' && Date.now() - (p.disconnectedAt || 0) > 60000);
                if (timedOutPlayers.length > 0) {
                    let currentGameState = gameState;
                    for (const player of timedOutPlayers) {
                        currentGameState = removePlayer(currentGameState, player.id);
                    }
                    if (currentGameState.players.length < 2) {
                        this.io.to(gameId).emit('gameEnded', 'The game has ended because a player was disconnected for too long.');
                        yield deleteGame(gameId);
                        for (const p of currentGameState.players) {
                            yield deletePlayerGame(p.id);
                        }
                    }
                    else {
                        yield this.updateGameState(gameId, currentGameState);
                    }
                }
            }
        }), 15000);
    }
    handleConnection(socket) {
        console.log(`User connected: ${socket.id}`);
        socket.on('createGame', ({ gameType, playerId }) => this.createGame(socket, gameType, playerId));
        socket.on('joinGame', ({ gameId, playerId }) => this.joinGame(socket, gameId, playerId));
        socket.on('rejoinGame', ({ gameId, playerId }) => this.rejoinGame(socket, gameId, playerId));
        socket.on('playerReady', (isReady) => this.handlePlayerReady(socket, isReady));
        socket.on('startGame', () => this.handleStartGame(socket));
        socket.on('placePiece', (placedPiece) => this.handlePlacePiece(socket, placedPiece));
        socket.on('passTurn', () => this.handlePassTurn(socket));
        socket.on('playAgainRequest', () => this.handlePlayAgainRequest(socket));
        socket.on('leaveLobby', () => this.handleLeaveLobby(socket));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }
    handleLeaveLobby(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            const gameId = yield getPlayerGame(playerId);
            if (!gameId)
                return;
            const gameState = yield getGame(gameId);
            if (!gameState || gameState.status !== 'lobby')
                return;
            const newGameState = removePlayer(gameState, playerId);
            yield deletePlayerGame(playerId);
            playerSocket.delete(playerId);
            yield this.updateGameState(gameId, newGameState);
            socket.emit('gameLeft');
            socket.leave(gameId);
        });
    }
    handleDuplicateConnection(playerId, newSocket) {
        const oldSocketId = playerSocket.get(playerId);
        if (oldSocketId && oldSocketId !== newSocket.id) {
            const oldSocket = this.io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
                oldSocket.emit('duplicateConnection');
                oldSocket.disconnect(true);
            }
        }
    }
    createGame(socket, gameType, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameId = Math.random().toString(36).substring(2, 7);
            const gameState = createInitialState(gameType);
            yield setGame(gameId, gameState);
            this.joinGame(socket, gameId, playerId);
        });
    }
    joinGame(socket, gameId, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.handleDuplicateConnection(playerId, socket);
            const gameState = yield getGame(gameId);
            const maxPlayers = (gameState === null || gameState === void 0 ? void 0 : gameState.gameType) === '2-player' ? 2 : (gameState === null || gameState === void 0 ? void 0 : gameState.gameType) === '3-player' ? 3 : 4;
            if (!gameState || gameState.status !== 'lobby' || gameState.players.length >= maxPlayers) {
                socket.emit('error', 'Game is full, in progress, or does not exist.');
                return;
            }
            socket.join(gameId);
            yield setPlayerGame(playerId, gameId);
            playerSocket.set(playerId, socket.id);
            const newGameState = addPlayer(gameState, playerId);
            yield this.updateGameState(gameId, newGameState);
            socket.emit('gameJoined', { gameId, playerId });
        });
    }
    rejoinGame(socket, gameId, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Attempting to rejoin player ${playerId} to game ${gameId}`);
            this.handleDuplicateConnection(playerId, socket);
            const gameState = yield getGame(gameId);
            console.log('Found gameState:', !!gameState);
            if (!gameState) {
                socket.emit('error', 'Could not find a game to rejoin.');
                return;
            }
            const playerIndex = gameState.players.findIndex(p => p.id === playerId);
            console.log('Found player in game at index:', playerIndex);
            if (playerIndex !== -1) {
                socket.join(gameId);
                yield setPlayerGame(playerId, gameId);
                playerSocket.set(playerId, socket.id);
                // --- IMMUTABILITY FIX ---
                // Create a new player object with the updated status
                const updatedPlayer = Object.assign(Object.assign({}, gameState.players[playerIndex]), { status: 'online', disconnectedAt: undefined });
                // Create a new players array
                const newPlayers = [
                    ...gameState.players.slice(0, playerIndex),
                    updatedPlayer,
                    ...gameState.players.slice(playerIndex + 1),
                ];
                // Create a new game state object
                const newGameState = Object.assign(Object.assign({}, gameState), { players: newPlayers });
                // --- END FIX ---
                console.log(`Player ${playerId} reconnected successfully.`);
                yield this.updateGameState(gameId, newGameState);
                socket.emit('gameJoined', { gameId, playerId });
                socket.emit('gameState', newGameState);
            }
            else {
                console.log(`Player ${playerId} not found in game ${gameId}.`);
                socket.emit('error', 'Could not rejoin game. Player not found.');
            }
        });
    }
    handlePlayerReady(socket, isReady) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            const gameId = yield getPlayerGame(playerId);
            if (gameId) {
                const gameState = yield getGame(gameId);
                if (gameState) {
                    const newGameState = setPlayerReady(gameState, playerId, isReady);
                    yield this.updateGameState(gameId, newGameState);
                }
            }
        });
    }
    handleStartGame(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            const gameId = yield getPlayerGame(playerId);
            if (gameId) {
                const gameState = yield getGame(gameId);
                if (gameState) {
                    const newGameState = startGame(gameState, playerId);
                    yield this.updateGameState(gameId, newGameState);
                }
            }
        });
    }
    handlePlacePiece(socket, placedPiece) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            const gameId = yield getPlayerGame(playerId);
            if (gameId) {
                const gameState = yield getGame(gameId);
                if (gameState && gameState.status === 'in-progress') {
                    const newGameState = placePiece(gameState, playerId, placedPiece);
                    yield this.updateGameState(gameId, newGameState);
                }
            }
        });
    }
    handlePassTurn(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            const gameId = yield getPlayerGame(playerId);
            if (gameId) {
                const gameState = yield getGame(gameId);
                if (gameState && gameState.status === 'in-progress') {
                    const newGameState = passTurn(gameState, playerId);
                    yield this.updateGameState(gameId, newGameState);
                }
            }
        });
    }
    handlePlayAgainRequest(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            const gameId = yield getPlayerGame(playerId);
            if (gameId) {
                const gameState = yield getGame(gameId);
                if (gameState && gameState.status === 'finished') {
                    const stateWithPlayerReady = setWantsToPlayAgain(gameState, playerId);
                    const finalState = resetGame(stateWithPlayerReady);
                    yield this.updateGameState(gameId, finalState);
                }
            }
        });
    }
    updateGameState(gameId, gameState) {
        return __awaiter(this, void 0, void 0, function* () {
            if (gameState.status === 'in-progress' && isGameOver(gameState)) {
                const newColors = gameState.colors.map((c) => {
                    let score = 0;
                    for (const pieceName of c.pieces) {
                        score -= pieces[pieceName].flat().reduce((sum, cell) => sum + cell, 0);
                    }
                    if (c.pieces.length === 0) {
                        score += 15;
                    }
                    return Object.assign(Object.assign({}, c), { score });
                });
                const finalState = Object.assign(Object.assign({}, gameState), { status: 'finished', colors: newColors });
                yield setGame(gameId, finalState);
                this.io.to(gameId).emit('gameState', finalState);
            }
            else {
                yield setGame(gameId, gameState);
                this.io.to(gameId).emit('gameState', gameState);
            }
        });
    }
    handleDisconnect(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(`User disconnected: ${socket.id}`);
            const playerId = (_a = [...playerSocket.entries()].find(([_, id]) => id === socket.id)) === null || _a === void 0 ? void 0 : _a[0];
            if (!playerId)
                return;
            playerSocket.delete(playerId);
            const gameId = yield getPlayerGame(playerId);
            if (gameId) {
                const gameState = yield getGame(gameId);
                if (gameState && gameState.status !== 'lobby') {
                    const player = gameState.players.find(p => p.id === playerId);
                    if (player) {
                        player.status = 'disconnected';
                        player.disconnectedAt = Date.now();
                        yield this.updateGameState(gameId, gameState);
                    }
                }
            }
        });
    }
}
