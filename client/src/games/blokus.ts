import { pieces } from '@game1000/common';
import type { PlayerColor, GameState, PlacedPiece, Piece } from '@game1000/common/types';

// This file contains client-side duplicates of the server's game logic.
// In a production-grade application, this logic would be shared in a way
// that avoids duplication, such as in a published NPM package or through
// a more advanced monorepo structure.

function rotate(piece: Piece, rotation: 0 | 90 | 180 | 270): Piece {
    if (rotation === 0) return piece;
    let rotated = piece;
    for (let i = 0; i < rotation / 90; i++) {
        rotated = rotated[0].map((_, colIndex) =>
            rotated.map(row => row[colIndex]).reverse()
        );
    }
    return rotated;
}

function flip(piece: Piece): Piece {
    return piece.map(row => row.slice().reverse());
}

function isValidPlacement(board: (PlayerColor | null)[][], playerColor: PlayerColor, piece: Piece, placedPiece: PlacedPiece): boolean {
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
