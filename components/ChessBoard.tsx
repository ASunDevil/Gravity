"use client";

import { ChessGameState, PlayerColor } from "@/lib/types";
import { Chess } from "chess.js";
import { useMemo, useState } from "react";

interface ChessBoardProps {
  gameState: ChessGameState;
  myColor?: PlayerColor; // 'w' | 'b'
  isMyTurn: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
}

const PIECE_UNICODE: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚', // Black
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔', // White
};

export default function ChessBoard({ gameState, myColor, isMyTurn, onMove }: ChessBoardProps) {
  const chess = useMemo(() => new Chess(gameState.fen), [gameState.fen]);
  const board = chess.board();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Convert 'black' | 'white' to 'b' | 'w' for logic if needed, 
  // but types says myColor is PlayerColor which is 'black'|'white'.
  // Chess uses 'w'/'b'. We need to map.
  const myChessColor = myColor === 'white' ? 'w' : myColor === 'black' ? 'b' : null;

  const handleSquareClick = (squareData: { square: string; piece: { type: string; color: string } | null } | null, row: number, col: number) => {
    if (!isMyTurn) return;

    const file = String.fromCharCode(97 + col);
    const rank = 8 - row;
    const square = `${file}${rank}` as any; // 'a1', 'h8', etc.

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      // Attempt move
      try {
        // Check if move is valid (handled by server, but pre-check helps UX)
        // We use verbose to check promotion
        const possibleMoves = chess.moves({ square: selectedSquare as any, verbose: true });
        const move = possibleMoves.find(m => m.to === square);

        if (move) {
          onMove({ from: selectedSquare, to: square, promotion: move.promotion ? 'q' : undefined });
          setSelectedSquare(null);
        } else {
             // If clicked on another own piece, select it instead
            const piece = chess.get(square);
            if (piece && piece.color === myChessColor) {
                setSelectedSquare(square);
            } else {
                setSelectedSquare(null);
            }
        }
      } catch (e) {
        setSelectedSquare(null);
      }
    } else {
      // Select piece
      const piece = chess.get(square);
      if (piece && piece.color === myChessColor) {
        setSelectedSquare(square);
      }
    }
  };

  return (
    <div className="relative p-2 bg-[#b58863] shadow-2xl rounded-sm select-none w-full max-w-[600px] aspect-square">
        {/* Board */}
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-4 border-[#b58863]">
            {board.map((row, r) => 
                row.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const file = String.fromCharCode(97 + c);
                    const rank = 8 - r;
                    const square = `${file}${rank}`;
                    const isSelected = selectedSquare === square;
                    const isLastMove = gameState.history.length > 0; // Simplified highlight for now
                    
                    return (
                        <div 
                            key={square}
                            className={`relative flex items-center justify-center text-4xl sm:text-5xl cursor-pointer
                                ${isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'}
                                ${isSelected ? 'ring-4 ring-yellow-400 z-10' : ''}
                            `}
                            onClick={() => handleSquareClick({ square, piece }, r, c)}
                        >
                            {/* File/Rank Labels */}
                            {c === 0 && <span className={`absolute top-0 left-1 text-[10px] font-bold ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>{rank}</span>}
                            {r === 7 && <span className={`absolute bottom-0 right-1 text-[10px] font-bold ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>{file}</span>}

                            {piece && (
                                <span 
                                    className={`
                                        drop-shadow-md transform transition-transform duration-200 
                                        ${isSelected ? 'scale-110' : ''}
                                        ${piece.color === 'w' ? 'text-white stroke-black' : 'text-black'}
                                    `}
                                    style={piece.color === 'w' ? { textShadow: '0px 0px 2px black' } : {}}
                                >
                                    {PIECE_UNICODE[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                                </span>
                            )}
                            
                            {/* Highlight valid moves (optional visual aid) */}
                            {selectedSquare && isMyTurn && (() => {
                                try {
                                    const moves = chess.moves({ square: selectedSquare as any, verbose: true });
                                    const isTarget = moves.some(m => m.to === square);
                                    if (isTarget) {
                                         return <div className={`absolute w-3 h-3 rounded-full ${piece ? 'ring-4 ring-gray-500/50' : 'bg-gray-500/50'}`} />
                                    }
                                } catch(e) {}
                            })()}
                        </div>
                    );
                })
            )}
        </div>
        
        {gameState.inCheck && (
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600/90 text-white px-6 py-2 rounded-full shadow-xl font-bold animate-pulse pointer-events-none z-20">
                 CHECK
             </div>
        )}
    </div>
  );
}
