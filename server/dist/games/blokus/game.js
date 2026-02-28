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
    for (const colorState of state.colors) {
        for (const pieceName of colorState.pieces) {
            const piece = pieces[pieceName];
            if (canPlace(state.board, colorState.color, piece)) {
                return false;
            }
        }
    }
    return true;
}
export function createInitialState(gameType) {
    return {
        board: Array(20).fill(null).map(() => Array(20).fill(null)),
        players: [],
        colors: [],
        currentPlayerIndex: 0,
        status: 'lobby',
        gameType,
    };
}
export function addPlayer(state, playerId) {
    const maxPlayers = state.gameType === '2-player' ? 2 : state.gameType === '3-player' ? 3 : 4;
    if (state.players.length >= maxPlayers)
        return state;
    const newPlayer = {
        id: playerId,
        isReady: false,
        wantsToPlayAgain: false,
    };
    return Object.assign(Object.assign({}, state), { players: [...state.players, newPlayer] });
}
export function getCurrentColorState(state) {
    return state.colors[state.currentPlayerIndex];
}
export function setPlayerReady(state, playerId, isReady) {
    return Object.assign(Object.assign({}, state), { players: state.players.map(p => p.id === playerId ? Object.assign(Object.assign({}, p), { isReady }) : p) });
}
export function startGame(state, playerId) {
    var _a;
    const minPlayers = state.gameType === '2-player' ? 2 : state.gameType === '3-player' ? 3 : 4;
    if (((_a = state.players[0]) === null || _a === void 0 ? void 0 : _a.id) !== playerId || state.players.length < minPlayers || state.players.some(p => !p.isReady))
        return state;
    const colors = ['blue', 'yellow', 'red', 'green'];
    let colorStates = [];
    if (state.gameType === '4-player') {
        colorStates = state.players.map((player, index) => ({
            color: colors[index],
            playerId: player.id,
            pieces: Object.keys(pieces),
            score: 0,
        }));
    }
    else if (state.gameType === '3-player') {
        colorStates = state.players.map((player, index) => ({
            color: colors[index],
            playerId: player.id,
            pieces: Object.keys(pieces),
            score: 0,
        }));
        colorStates.push({
            color: 'green',
            playerId: 'shared',
            pieces: Object.keys(pieces),
            score: 0,
        });
    }
    else if (state.gameType === '2-player') {
        colorStates = [
            { color: 'blue', playerId: state.players[0].id, pieces: Object.keys(pieces), score: 0 },
            { color: 'yellow', playerId: state.players[1].id, pieces: Object.keys(pieces), score: 0 },
            { color: 'red', playerId: state.players[0].id, pieces: Object.keys(pieces), score: 0 },
            { color: 'green', playerId: state.players[1].id, pieces: Object.keys(pieces), score: 0 },
        ];
    }
    return Object.assign(Object.assign({}, state), { status: 'in-progress', colors: colorStates, sharedColorPlayerIndex: 0 });
}
export function placePiece(state, playerId, placedPiece) {
    var _a;
    const currentColor = getCurrentColorState(state);
    if (!currentColor)
        return state;
    if (currentColor.playerId === 'shared') {
        const sharedPlayer = state.players[state.sharedColorPlayerIndex];
        if (sharedPlayer.id !== playerId)
            return state;
    }
    else {
        if (currentColor.playerId !== playerId)
            return state;
    }
    const pieceName = placedPiece.piece;
    const pieceShape = pieces[pieceName];
    if (!currentColor.pieces.includes(pieceName))
        return state;
    if (!isValidPlacement(state.board, currentColor.color, pieceShape, placedPiece))
        return state;
    const newBoard = state.board.map(row => row.slice());
    const finalPiece = rotate(placedPiece.isFlipped ? flip(pieceShape) : pieceShape, placedPiece.rotation);
    let pieceSquareCount = 0;
    for (let row = 0; row < finalPiece.length; row++) {
        for (let col = 0; col < finalPiece[row].length; col++) {
            if (finalPiece[row][col] === 1) {
                newBoard[placedPiece.y + row][placedPiece.x + col] = currentColor.color;
                pieceSquareCount++;
            }
        }
    }
    const newColors = state.colors.map(c => {
        if (c.color === currentColor.color) {
            return Object.assign(Object.assign({}, c), { pieces: c.pieces.filter(pName => pName !== pieceName), score: c.score + pieceSquareCount });
        }
        return c;
    });
    const nextState = Object.assign(Object.assign({}, state), { board: newBoard, colors: newColors, currentPlayerIndex: (state.currentPlayerIndex + 1) % state.colors.length });
    if (state.gameType === '3-player' && ((_a = getCurrentColorState(nextState)) === null || _a === void 0 ? void 0 : _a.playerId) === 'shared') {
        nextState.sharedColorPlayerIndex = (state.sharedColorPlayerIndex + 1) % 3;
    }
    return nextState;
}
export function passTurn(state, playerId) {
    var _a;
    const currentColor = getCurrentColorState(state);
    if (!currentColor)
        return state;
    if (currentColor.playerId === 'shared') {
        const sharedPlayer = state.players[state.sharedColorPlayerIndex];
        if (sharedPlayer.id !== playerId)
            return state;
    }
    else {
        if (currentColor.playerId !== playerId)
            return state;
    }
    const nextState = Object.assign(Object.assign({}, state), { currentPlayerIndex: (state.currentPlayerIndex + 1) % state.colors.length });
    if (state.gameType === '3-player' && ((_a = getCurrentColorState(nextState)) === null || _a === void 0 ? void 0 : _a.playerId) === 'shared') {
        nextState.sharedColorPlayerIndex = (state.sharedColorPlayerIndex + 1) % 3;
    }
    return nextState;
}
export function setWantsToPlayAgain(state, playerId) {
    return Object.assign(Object.assign({}, state), { players: state.players.map(p => p.id === playerId ? Object.assign(Object.assign({}, p), { wantsToPlayAgain: true }) : p) });
}
export function resetGame(state) {
    if (state.players.every(p => p.wantsToPlayAgain)) {
        const freshState = createInitialState(state.gameType);
        // Re-add players in the same order
        let intermediateState = freshState;
        for (const player of state.players) {
            intermediateState = addPlayer(intermediateState, player.id);
        }
        return intermediateState;
    }
    return state;
}
export function removePlayer(state, playerId) {
    const newPlayers = state.players.filter(p => p.id !== playerId);
    let newColors = state.colors;
    if (state.status !== 'lobby') {
        newColors = state.colors.filter(c => c.playerId !== playerId);
        if (state.gameType === '3-player') {
            const playerIndex = state.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1 && state.sharedColorPlayerIndex >= playerIndex) {
                state.sharedColorPlayerIndex = Math.max(0, state.sharedColorPlayerIndex - 1);
            }
        }
    }
    return Object.assign(Object.assign({}, state), { players: newPlayers, colors: newColors });
}
