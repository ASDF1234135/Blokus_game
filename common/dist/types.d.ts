import { pieces } from './values.js';
export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export interface Player {
    id: string;
    isReady: boolean;
    wantsToPlayAgain: boolean;
    status: 'online' | 'disconnected';
    disconnectedAt?: number;
}
export interface ColorState {
    color: PlayerColor;
    playerId: string;
    pieces: (keyof typeof pieces)[];
    score: number;
}
export type GameType = '2-player' | '3-player' | '4-player';
export interface GameState {
    board: (PlayerColor | null)[][];
    players: Player[];
    colors: ColorState[];
    currentPlayerIndex: number;
    status: 'lobby' | 'in-progress' | 'finished';
    gameType: GameType;
    sharedColorPlayerIndex?: number;
}
export interface PlacedPiece {
    piece: keyof typeof pieces;
    x: number;
    y: number;
    rotation: 0 | 90 | 180 | 270;
    isFlipped: boolean;
}
export type Piece = (0 | 1)[][];
