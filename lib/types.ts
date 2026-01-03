export interface User {
  id: string; // Socket ID
  nickname: string;
  avatar: string; // Emoji or URL
  isAi?: boolean;
}

export type PlayerColor = 'black' | 'white';
export type GameType = 'renju' | 'chess' | 'go';

export interface Player extends User {
  color?: PlayerColor; // For Renju/Go: 'black' | 'white', For Chess: 'w' | 'b'
  ready: boolean;
}

export interface Room {
  id: string;
  name: string;
  gameType: GameType;
  players: Player[];
  spectators: User[];
  status: 'waiting' | 'playing' | 'ended';
  gameState?: GameState;
  createdAt: number;
  vsAi?: boolean;
}

export interface RenjuGameState {
  type: 'renju';
  board: (PlayerColor | null)[][];
  currentPlayer: PlayerColor;
  winner: PlayerColor | null | 'draw';
  history: { x: number; y: number; color: PlayerColor; duration: number }[];
  lastMoveTime: number;
}

export interface ChessGameState {
  type: 'chess';
  fen: string;
  turn: 'w' | 'b';
  winner: 'w' | 'b' | 'draw' | null;
  history: { san: string; duration: number }[]; // Changed to object
  inCheck?: boolean;
  lastMoveTime: number;
}

export interface GoGameState {
  type: 'go';
  board: (PlayerColor | null)[][]; // 19x19
  currentPlayer: PlayerColor;
  winner: PlayerColor | null | 'draw';
  history: { x: number; y: number; color: PlayerColor; duration: number }[];
  captured: { black: number; white: number }; // Stones captured BY that color
  previousBoard?: (PlayerColor | null)[][]; // For Simple Ko check
  passes: number; // Consecutive passes to detect game end
  lastMoveTime: number;
}

export type GameState = RenjuGameState | ChessGameState | GoGameState;


export const BOARD_SIZE = 15;
export const GO_BOARD_SIZE = 19;
