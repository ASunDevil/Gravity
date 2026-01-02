import { Chess } from 'chess.js';
import { ChessGameState } from '../types';

export function createInitialChessState(): ChessGameState {
  const chess = new Chess();
  return {
    type: 'chess',
    fen: chess.fen(),
    turn: 'w',
    winner: null,
    history: [],
    inCheck: false,
    lastMoveTime: Date.now(),
  };
}

export function isValidChessMove(fen: string, move: { from: string; to: string; promotion?: string }): boolean {
  try {
    const chess = new Chess(fen);
    const result = chess.move(move);
    return !!result;
  } catch (e) {
    return false;
  }
}

export function makeChessMove(gameState: ChessGameState, move: { from: string; to: string; promotion?: string }, duration: number = 0): ChessGameState {
  const chess = new Chess(gameState.fen);
  try {
    const result = chess.move(move);
    if (!result) return gameState;

    let winner: 'w' | 'b' | 'draw' | null = null;
    if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
            winner = chess.turn() === 'w' ? 'b' : 'w'; // Previous turn won
        } else {
            winner = 'draw';
        }
    }

    return {
      type: 'chess',
      fen: chess.fen(),
      turn: chess.turn(),
      winner,
      history: [...gameState.history, { san: result.san, duration }],
      inCheck: chess.inCheck(),
      lastMoveTime: Date.now(),
    };
  } catch (e) {
    return gameState;
  }
}
