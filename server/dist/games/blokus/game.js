import { pieces } from '@game1000/common';
function rotate(piece, rotation) {
    if (rotation === 0)
        return piece;
    let rotated = piece;
    for (let i = 0; i < rotation / 90; i++) {
        rotated = rotated[0].map((_, colIndex) => rotated.map((row) => row[colIndex]).reverse());
    }
    return rotated;
}
function flip(piece) {
    return piece.map((row) => row.slice().reverse());
}
export function canPlace(board, playerColor, piece) {
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
            for (let rotation of [0, 90, 180, 270]) {
                for (let isFlipped of [false, true]) {
                    const placedPiece = { piece: 'I1', x, y, rotation, isFlipped };
                    if (isValidPlacement(board, playerColor, piece, placedPiece)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}
export function isValidPlacement(board, playerColor, piece, placedPiece) {
    const { x, y, rotation, isFlipped } = placedPiece;
    const finalPiece = rotate(isFlipped ? flip(piece) : piece, rotation);
    let touchesCorner = false;
    const isFirstMove = board.flat().every(cell => cell !== playerColor);
    for (let row = 0; row < finalPiece.length; row++) {
        for (let col = 0; col < finalPiece[row].length; col++) {
            if (finalPiece[row][col] === 1) {
                const boardX = x + col;
                const boardY = y + row;
                if (boardX < 0 || boardX >= 20 || boardY < 0 || boardY >= 20 || board[boardY][boardX] !== null) {
                    return false;
                }
                const neighbors = [[boardY, boardX - 1], [boardY, boardX + 1], [boardY - 1, boardX], [boardY + 1, boardX]];
                for (const [ny, nx] of neighbors) {
                    if (ny >= 0 && ny < 20 && nx >= 0 && nx < 20 && board[ny][nx] === playerColor) {
                        return false; // Touches side, invalid
                    }
                }
                if (!isFirstMove) {
                    const cornerNeighbors = [[boardY - 1, boardX - 1], [boardY - 1, boardX + 1], [boardY + 1, boardX - 1], [boardY + 1, boardX + 1]];
                    for (const [ny, nx] of cornerNeighbors) {
                        if (ny >= 0 && ny < 20 && nx >= 0 && nx < 20 && board[ny][nx] === playerColor) {
                            touchesCorner = true;
                        }
                    }
                }
            }
        }
    }
    if (isFirstMove) {
        let coversStartingCorner = false;
        for (let row = 0; row < finalPiece.length; row++) {
            for (let col = 0; col < finalPiece[row].length; col++) {
                if (finalPiece[row][col] === 1) {
                    const boardX = x + col;
                    const boardY = y + row;
                    const isBoardCorner = (boardX === 0 && boardY === 0) || (boardX === 19 && boardY === 0) || (boardX === 0 && boardY === 19) || (boardX === 19 && boardY === 19);
                    if (isBoardCorner) {
                        coversStartingCorner = true;
                        break;
                    }
                }
            }
            if (coversStartingCorner)
                break;
        }
        return coversStartingCorner;
    }
    return touchesCorner;
}
export function isGameOver(state) {
    for (const player of state.players) {
        for (const pieceName of player.pieces) {
            const piece = pieces[pieceName];
            if (canPlace(state.board, player.color, piece)) {
                return false;
            }
        }
    }
    return true;
}
export function createInitialState() {
    return {
        board: Array(20).fill(null).map(() => Array(20).fill(null)),
        players: [],
        currentPlayerIndex: 0,
        status: 'lobby',
    };
}
export function addPlayer(state, playerId) {
    if (state.players.length >= 4)
        return state;
    const colors = ['blue', 'yellow', 'red', 'green'];
    const newPlayer = {
        id: playerId,
        color: colors[state.players.length],
        pieces: Object.keys(pieces),
        score: 0,
        isReady: false,
        wantsToPlayAgain: false,
    };
    return Object.assign(Object.assign({}, state), { players: [...state.players, newPlayer] });
}
export function getCurrentPlayer(state) {
    return state.players[state.currentPlayerIndex];
}
export function setPlayerReady(state, playerId, isReady) {
    return Object.assign(Object.assign({}, state), { players: state.players.map(p => p.id === playerId ? Object.assign(Object.assign({}, p), { isReady }) : p) });
}
export function startGame(state, playerId) {
    var _a;
    if (((_a = state.players[0]) === null || _a === void 0 ? void 0 : _a.id) !== playerId || state.players.length < 2 || state.players.some(p => !p.isReady))
        return state;
    return Object.assign(Object.assign({}, state), { status: 'in-progress' });
}
export function placePiece(state, playerId, placedPiece) {
    const currentPlayer = getCurrentPlayer(state);
    if (!currentPlayer || currentPlayer.id !== playerId)
        return state;
    const pieceName = placedPiece.piece;
    const pieceShape = pieces[pieceName];
    if (!currentPlayer.pieces.includes(pieceName))
        return state;
    if (!isValidPlacement(state.board, currentPlayer.color, pieceShape, placedPiece))
        return state;
    const newBoard = state.board.map(row => row.slice());
    const finalPiece = rotate(placedPiece.isFlipped ? flip(pieceShape) : pieceShape, placedPiece.rotation);
    let pieceSquareCount = 0;
    for (let row = 0; row < finalPiece.length; row++) {
        for (let col = 0; col < finalPiece[row].length; col++) {
            if (finalPiece[row][col] === 1) {
                newBoard[placedPiece.y + row][placedPiece.x + col] = currentPlayer.color;
                pieceSquareCount++;
            }
        }
    }
    const newPlayers = state.players.map(p => {
        if (p.id === playerId) {
            return Object.assign(Object.assign({}, p), { pieces: p.pieces.filter(pName => pName !== pieceName), score: p.score + pieceSquareCount });
        }
        return p;
    });
    return Object.assign(Object.assign({}, state), { board: newBoard, players: newPlayers, currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length });
}
export function passTurn(state, playerId) {
    const currentPlayer = getCurrentPlayer(state);
    if (!currentPlayer || currentPlayer.id !== playerId)
        return state;
    return Object.assign(Object.assign({}, state), { currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length });
}
export function setWantsToPlayAgain(state, playerId) {
    return Object.assign(Object.assign({}, state), { players: state.players.map(p => p.id === playerId ? Object.assign(Object.assign({}, p), { wantsToPlayAgain: true }) : p) });
}
export function resetGame(state) {
    if (state.players.every(p => p.wantsToPlayAgain)) {
        const freshState = createInitialState();
        // Re-add players in the same order
        let intermediateState = freshState;
        for (const player of state.players) {
            intermediateState = addPlayer(intermediateState, player.id);
        }
        return intermediateState;
    }
    return state;
}
