import { pieces } from '@game1000/common';
import type { PlayerColor, Player, GameState, PlacedPiece, Piece, ColorState, GameType } from '@game1000/common/types';

function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

function rotate(piece: Piece, rotation: 0 | 90 | 180 | 270): Piece {
    if (rotation === 0) return piece;
    let rotated = piece;
    for (let i = 0; i < rotation / 90; i++) {
        rotated = rotated[0].map((_: (0 | 1), colIndex: number) =>
            rotated.map((row: (0 | 1)[]) => row[colIndex]).reverse()
        );
    }
    return rotated;
}

function flip(piece: Piece): Piece {
    return piece.map((row: (0 | 1)[]) => row.slice().reverse());
}

export function canPlace(board: (PlayerColor | null)[][], playerColor: PlayerColor, piece: Piece): boolean {
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
            for (let rotation of [0, 90, 180, 270] as const) {
                for (let isFlipped of [false, true]) {
                    const placedPiece: PlacedPiece = { piece: 'I1', x, y, rotation, isFlipped };
                    if (isValidPlacement(board, playerColor, piece, placedPiece)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

export function isValidPlacement(board: (PlayerColor | null)[][], playerColor: PlayerColor, piece: Piece, placedPiece: PlacedPiece): boolean {
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
            if (coversStartingCorner) break;
        }
        return coversStartingCorner;
    }

    return touchesCorner;
}

export function isGameOver(state: GameState): boolean {
    for (const colorState of state.colors) {
        for (const pieceName of colorState.pieces) {
            const piece = pieces[pieceName] as Piece;
            if (canPlace(state.board, colorState.color, piece)) {
                return false;
            }
        }
    }
    return true;
}

export function createInitialState(gameType: GameType): GameState {
    return {
        board: Array(20).fill(null).map(() => Array(20).fill(null)),
        players: [],
        colors: [],
        currentPlayerIndex: 0,
        status: 'lobby',
        gameType,
    };
}

export function addPlayer(state: GameState, playerId: string): GameState {
    const maxPlayers = state.gameType === '2-player' ? 2 : state.gameType === '3-player' ? 3 : 4;
    if (state.players.length >= maxPlayers) return state;

    const newPlayer: Player = {
        id: playerId,
        isReady: false,
        wantsToPlayAgain: false,
        status: 'online',
    };
    return { ...state, players: [...state.players, newPlayer] };
}

export function getCurrentColorState(state: GameState): ColorState | undefined {
    return state.colors[state.currentPlayerIndex];
}

export function setPlayerReady(state: GameState, playerId: string, isReady: boolean): GameState {
    return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, isReady } : p) };
}

export function startGame(state: GameState, playerId: string): GameState {
    const minPlayers = state.gameType === '2-player' ? 2 : state.gameType === '3-player' ? 3 : 4;
    if (state.players[0]?.id !== playerId || state.players.length < minPlayers || state.players.some(p => !p.isReady)) return state;

    const shuffledPlayers = shuffle(state.players);

    const colors: PlayerColor[] = ['blue', 'yellow', 'red', 'green'];
    let colorStates: ColorState[] = [];

    if (state.gameType === '4-player') {
        colorStates = shuffledPlayers.map((player, index) => ({
            color: colors[index],
            playerId: player.id,
            pieces: Object.keys(pieces) as (keyof typeof pieces)[],
            score: 0,
        }));
    } else if (state.gameType === '3-player') {
        colorStates = shuffledPlayers.map((player, index) => ({
            color: colors[index],
            playerId: player.id,
            pieces: Object.keys(pieces) as (keyof typeof pieces)[],
            score: 0,
        }));
        colorStates.push({
            color: 'green',
            playerId: 'shared',
            pieces: Object.keys(pieces) as (keyof typeof pieces)[],
            score: 0,
        });
    } else if (state.gameType === '2-player') {
        colorStates = [
            { color: 'blue', playerId: shuffledPlayers[0].id, pieces: Object.keys(pieces) as (keyof typeof pieces)[], score: 0 },
            { color: 'yellow', playerId: shuffledPlayers[1].id, pieces: Object.keys(pieces) as (keyof typeof pieces)[], score: 0 },
            { color: 'red', playerId: shuffledPlayers[0].id, pieces: Object.keys(pieces) as (keyof typeof pieces)[], score: 0 },
            { color: 'green', playerId: shuffledPlayers[1].id, pieces: Object.keys(pieces) as (keyof typeof pieces)[], score: 0 },
        ];
    }
    
    return { ...state, status: 'in-progress', colors: colorStates, sharedColorPlayerIndex: 0, players: shuffledPlayers };
}

export function placePiece(state: GameState, playerId: string, placedPiece: PlacedPiece): GameState {
    const currentColor = getCurrentColorState(state);
    if (!currentColor) return state;

    if (currentColor.playerId === 'shared') {
        const sharedPlayer = state.players[state.sharedColorPlayerIndex!];
        if (sharedPlayer.id !== playerId) return state;
    } else {
        if (currentColor.playerId !== playerId) return state;
    }

    const pieceName = placedPiece.piece;
    const pieceShape = pieces[pieceName] as Piece;
    if (!currentColor.pieces.includes(pieceName)) return state;

    if (!isValidPlacement(state.board, currentColor.color, pieceShape, placedPiece)) return state;

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
            return {
                ...c,
                pieces: c.pieces.filter(pName => pName !== pieceName),
                score: c.score + pieceSquareCount,
            };
        }
        return c;
    });
    
    const nextState = { ...state, board: newBoard, colors: newColors, currentPlayerIndex: (state.currentPlayerIndex + 1) % state.colors.length };

    if (state.gameType === '3-player' && getCurrentColorState(nextState)?.playerId === 'shared') {
        nextState.sharedColorPlayerIndex = (state.sharedColorPlayerIndex! + 1) % 3;
    }

    return nextState;
}

export function passTurn(state: GameState, playerId: string): GameState {
    const currentColor = getCurrentColorState(state);
    if (!currentColor) return state;

    if (currentColor.playerId === 'shared') {
        const sharedPlayer = state.players[state.sharedColorPlayerIndex!];
        if (sharedPlayer.id !== playerId) return state;
    } else {
        if (currentColor.playerId !== playerId) return state;
    }

    const nextState = { ...state, currentPlayerIndex: (state.currentPlayerIndex + 1) % state.colors.length };

    if (state.gameType === '3-player' && getCurrentColorState(nextState)?.playerId === 'shared') {
        nextState.sharedColorPlayerIndex = (state.sharedColorPlayerIndex! + 1) % 3;
    }
    
    return nextState;
}

export function setWantsToPlayAgain(state: GameState, playerId: string): GameState {
    return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p, wantsToPlayAgain: true } : p),
    };
}

export function resetGame(state: GameState): GameState {
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

export function removePlayer(state: GameState, playerId: string): GameState {
    const newPlayers = state.players.filter(p => p.id !== playerId);
    let newColors = state.colors;

    if (state.status !== 'lobby') {
        newColors = state.colors.filter(c => c.playerId !== playerId);

        if (state.gameType === '3-player') {
            const playerIndex = state.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1 && state.sharedColorPlayerIndex! >= playerIndex) {
                state.sharedColorPlayerIndex = Math.max(0, state.sharedColorPlayerIndex! - 1);
            }
        }
    }

    return { ...state, players: newPlayers, colors: newColors };
}
