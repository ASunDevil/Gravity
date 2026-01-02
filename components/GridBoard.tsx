"use client";

import { useMemo } from "react";
import { PlayerColor } from "@/lib/types";

interface GridBoardProps {
  board: (PlayerColor | null)[][];
  size: number;
  myColor?: PlayerColor;
  isMyTurn: boolean;
  onMove: (x: number, y: number) => void;
  lastMove?: { x: number, y: number };
}

export default function GridBoard({ board, size, myColor, isMyTurn, onMove, lastMove }: GridBoardProps) {

  // Dynamic grid lines calculation
  // We need n lines. 
  // Percentage positions: 0 to 100%
  // The grid lines should go through the center of the cells if we treat intersections as cells?
  // No, in Go/Renju, stones are ON intersections.
  // So we draw lines relative to container.

  return (
    <div className="relative p-8 bg-[#E3C16F] shadow-2xl rounded-sm select-none">
      {/* Coordinates */}
      {/* Top (Alphabet A-T excluding I?) Go usually excludes I. Renju A-O. */}
      {/* For simplicity we just use A-Z, maybe skipping I if strict */}
      <div className="absolute top-2 left-8 right-8 flex justify-between text-xs font-bold font-mono">
        {Array.from({ length: size }).map((_, i) => (
          <span key={`top-${i}`} className="w-1 text-center">{String.fromCharCode(65 + i + (i >= 8 ? 1 : 0))}</span>
        ))}
      </div>
      {/* Left (Numbers) */}
      <div className="absolute left-2 top-8 bottom-8 flex flex-col justify-between text-xs font-bold font-mono">
        {Array.from({ length: size }).map((_, i) => (
          <span key={`left-${i}`} className="h-1 flex items-center justify-center">{size - i}</span>
        ))}
      </div>

      <div className="relative aspect-square w-full max-w-[800px]">
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute bg-black h-[1px] w-full"
              style={{ top: `${(i / (size - 1)) * 100}%` }}
            />
          ))}
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute bg-black w-[1px] h-full"
              style={{ left: `${(i / (size - 1)) * 100}%` }}
            />
          ))}

          {/* Star points (Hoshi) */}
          {/* Determine star points based on size */}
          {size === 19 && [3, 9, 15].map(y => [3, 9, 15].map(x => (
            <div key={`star-${x}-${y}`} className="absolute z-20 w-2 h-2 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / (size - 1)) * 100}%`, top: `${(y / (size - 1)) * 100}%` }} />
          )))}
          {size === 15 && [3, 11].map(y => [3, 11].map(x => (
            <div key={`star-${x}-${y}`} className="absolute z-20 w-2 h-2 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / (size - 1)) * 100}%`, top: `${(y / (size - 1)) * 100}%` }} />
          )))}
          {/* Center (Tengen) if odd size */}
          {size % 2 !== 0 && (
            <div className="absolute z-20 w-3 h-3 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-sm"
              style={{ left: '50%', top: '50%' }} />
          )}
        </div>

        {/* Intersections / Stones */}
        <div className="absolute inset-0">
          {board.map((row, y) =>
            row.map((cell, x) => {
              const isLastMove = lastMove?.x === x && lastMove?.y === y;
              const canMove = isMyTurn && cell === null;

              // Size adjustment for 19x19 vs 15x15
              const stoneSize = size === 19 ? '4.5%' : '6%';

              return (
                <div
                  key={`${x}-${y}`}
                  className="absolute"
                  style={{
                    left: `${(x / (size - 1)) * 100}%`,
                    top: `${(y / (size - 1)) * 100}%`,
                    width: stoneSize,
                    height: stoneSize,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  onClick={() => canMove && onMove(x, y)}
                >
                  {/* Stone */}
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

                  {/* Click Target */}
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
