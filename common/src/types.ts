import { pieces } from './values.js';

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Player {
  id: string;
  color: PlayerColor;
  pieces: (keyof typeof pieces)[];
  score: number;
  isReady: boolean;
  wantsToPlayAgain: boolean;
}

export interface GameState {
  board: (PlayerColor | null)[][];
  players: Player[];
  currentPlayerIndex: number;
  status: 'lobby' | 'in-progress' | 'finished';
}

export interface PlacedPiece {
  piece: keyof typeof pieces;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  isFlipped: boolean;
}

export type Piece = (0 | 1)[][];
