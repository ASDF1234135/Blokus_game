import { pieces } from './values.js';

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

// Represents a player connection
export interface Player {
  id: string;
  isReady: boolean;
  wantsToPlayAgain: boolean;
  status: 'online' | 'disconnected';
  disconnectedAt?: number;
}

// Represents the state of a color in the game
export interface ColorState {
  color: PlayerColor;
  playerId: string; // The ID of the player controlling this color. Can be a player's ID or a special value for shared colors.
  pieces: (keyof typeof pieces)[];
  score: number;
}

export type GameType = '2-player' | '3-player' | '4-player';

export interface GameState {
  board: (PlayerColor | null)[][];
  players: Player[]; // Human players
  colors: ColorState[]; // State for each color
  currentPlayerIndex: number; // Index for the color currently playing
  status: 'lobby' | 'in-progress' | 'finished';
  gameType: GameType;
  sharedColorPlayerIndex?: number; // For 3-player game, index of player in players array
}

export interface PlacedPiece {
  piece: keyof typeof pieces;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  isFlipped: boolean;
}

export type Piece = (0 | 1)[][];
