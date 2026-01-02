"use client";

import { RenjuGameState, PlayerColor, BOARD_SIZE } from "@/lib/types";
import { useMemo } from "react";

interface BoardProps {
  gameState: RenjuGameState;
  myColor?: PlayerColor;
  isMyTurn: boolean;
  onMove: (x: number, y: number) => void;
}

export default function Board({ gameState, myColor, isMyTurn, onMove }: BoardProps) {
  const { board, history } = gameState;
  const lastMove = history[history.length - 1];

  return (
    <div className="relative p-8 bg-[#E3C16F] shadow-2xl rounded-sm select-none">
      {/* Coordinates */}
      {/* Top (Alphabet A-O) */}
      <div className="absolute top-2 left-8 right-8 flex justify-between text-xs font-bold font-mono">
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <span key={`top-${i}`} className="w-1 text-center">{String.fromCharCode(65 + i)}</span>
        ))}
      </div>
      {/* Bottom (Alphabet A-O) */}
      <div className="absolute bottom-2 left-8 right-8 flex justify-between text-xs font-bold font-mono">
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <span key={`bot-${i}`} className="w-1 text-center">{String.fromCharCode(65 + i)}</span>
        ))}
      </div>
      {/* Left (Numbers 0-14, 0 at bottom) */}
      <div className="absolute left-2 top-8 bottom-8 flex flex-col justify-between text-xs font-bold font-mono">
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <span key={`left-${i}`} className="h-1 flex items-center justify-center">{BOARD_SIZE - 1 - i}</span>
        ))}
      </div>
      {/* Right (Numbers 0-14, 0 at bottom) */}
      <div className="absolute right-2 top-8 bottom-8 flex flex-col justify-between text-xs font-bold font-mono">
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <span key={`right-${i}`} className="h-1 flex items-center justify-center">{BOARD_SIZE - 1 - i}</span>
        ))}
      </div>

      <div className="relative aspect-square w-full max-w-[800px]">
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute bg-black h-[1px] w-full"
              style={{ top: `${(i / (BOARD_SIZE - 1)) * 100}%` }}
            />
          ))}
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute bg-black w-[1px] h-full"
              style={{ left: `${(i / (BOARD_SIZE - 1)) * 100}%` }}
            />
          ))}
          {/* Center dot (Tengen) */}
          <div className="absolute z-20 w-3 h-3 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-sm"
            style={{ top: '50%', left: '50%' }} />

          {/* Star points (Hoshi) */}
          {[3, 11].map(y => [3, 11].map(x => (
            <div key={`star-${x}-${y}`} className="absolute z-20 w-2 h-2 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / (BOARD_SIZE - 1)) * 100}%`, top: `${(y / (BOARD_SIZE - 1)) * 100}%` }} />
          )))}
        </div>

        {/* Intersections / Stones */}
        <div className="absolute inset-0">
          {board.map((row, y) =>
            row.map((cell, x) => {
              const isLastMove = lastMove?.x === x && lastMove?.y === y;
              const canMove = isMyTurn && cell === null;

              return (
                <div
                  key={`${x}-${y}`}
                  className="absolute"
                  style={{
                    left: `${(x / (BOARD_SIZE - 1)) * 100}%`,
                    top: `${(y / (BOARD_SIZE - 1)) * 100}%`,
                    width: '6%',
                    height: '6%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  onClick={() => canMove && onMove(x, y)}
                >
                  {/* Stone with 3D effect */}
                  {cell && (
                    <div className={`w-full h-full rounded-full shadow-[2px_2px_4px_rgba(0,0,0,0.5)] 
                          ${cell === 'black'
                        ? 'bg-radial-[at_30%_30%]_from-gray-600_via-black_to-black'
                        : 'bg-radial-[at_30%_30%]_from-white_via-gray-200_to-gray-400'} 
                          flex items-center justify-center`}
                      style={{
                        background: cell === 'black'
                          ? 'radial-gradient(circle at 35% 35%, #666, #000)'
                          : 'radial-gradient(circle at 35% 35%, #fff, #ddd, #999)'
                      }}
                    >
                      {isLastMove && <div className="w-1/2 h-1/2 border-2 border-red-500/80 rounded-full" />}
                    </div>
                  )}

                  {/* Invisible Click Target if empty */}
                  {!cell && (
                    <div className={`w-full h-full rounded-full cursor-pointer 
                        ${canMove ? 'hover:bg-black/20' : ''}`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
