import { GameState, GameType, RenjuGameState, ChessGameState, GoGameState, BOARD_SIZE, GO_BOARD_SIZE } from '../types';
import { isValidMove } from '../game/renju';
import { isValidGoMove } from '../game/go';
import { Chess } from 'chess.js';

import { generateMove } from './gemini';
import { RENJU_SYSTEM_INSTRUCTION, CHESS_SYSTEM_INSTRUCTION, GO_SYSTEM_INSTRUCTION } from './prompts';
import { renjuToAscii, chessToFenAndMoves, goToAscii } from './adapters';

export async function getAiMove(gameState: GameState, gameType: GameType): Promise<any | null> {
    // Try Gemini First
    if (process.env.GEMINI_API_KEY) {
        try {
            if (gameType === 'renju' && gameState.type === 'renju') {
                const prompt = RENJU_SYSTEM_INSTRUCTION + "\nCurrent Board:\n" + renjuToAscii(gameState) + `\nYou are playing: ${gameState.currentPlayer === 'black' ? 'Black (X)' : 'White (O)'}`;
                console.log("[Gemini Input] Renju:", prompt);
                const moveStr = await generateMove(prompt, 'renju');
                console.log("[Gemini Output] Renju:", moveStr);
                if (moveStr) {
                    const jsonStart = moveStr.indexOf('{');
                    const jsonEnd = moveStr.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        const json = JSON.parse(moveStr.substring(jsonStart, jsonEnd + 1));
                        if (isValidMove(gameState, json.x, json.y)) return json;
                    }
                }
            } else if (gameType === 'chess' && gameState.type === 'chess') {
                const prompt = CHESS_SYSTEM_INSTRUCTION + "\nCurrent State:\n" + chessToFenAndMoves(gameState);
                console.log("[Gemini Input] Chess:", prompt);
                const moveStr = await generateMove(prompt, 'chess');
                console.log("[Gemini Output] Chess:", moveStr);
                if (moveStr) {
                    // Clean up moveStr (sometimes it might have quotes or extra text if prompt fails)
                    const saneMove = moveStr.replace(/["'\n]/g, '').trim();
                    // Validate basic SAN?
                    return getChessMoveFromSan(gameState, saneMove);
                }
            } else if (gameType === 'go' && gameState.type === 'go') {
                const prompt = GO_SYSTEM_INSTRUCTION + "\nCurrent Board:\n" + goToAscii(gameState) + `\nYou are playing: ${gameState.currentPlayer === 'black' ? 'Black (X)' : 'White (O)'}`;
                console.log("[Gemini Input] Go:", prompt);
                const moveStr = await generateMove(prompt, 'go');
                console.log("[Gemini Output] Go:", moveStr);
                if (moveStr) {
                    const jsonStart = moveStr.indexOf('{');
                    const jsonEnd = moveStr.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        const json = JSON.parse(moveStr.substring(jsonStart, jsonEnd + 1));
                        if (isValidGoMove(gameState, json.x, json.y, gameState.currentPlayer)) return json;
                    }
                }
            }
        } catch (e) {
            console.error("Gemini AI failed, falling back to heuristic:", e);
        }
    }

    // Fallback System
    if (gameType === 'renju' && gameState.type === 'renju') {
        return getRenjuMove(gameState);
    } else if (gameType === 'chess' && gameState.type === 'chess') {
        return getChessMove(gameState);
    } else if (gameType === 'go' && gameState.type === 'go') {
        return getGoMove(gameState);
    }
    return null;
}

function getChessMoveFromSan(state: ChessGameState, san: string) {
    try {
        const chess = new Chess(state.fen);
        const result = chess.move(san);
        if (result) return { from: result.from, to: result.to, promotion: result.promotion };
    } catch (e) { }
    return null;
}

function getRenjuMove(state: RenjuGameState): { x: number, y: number } | null {
    // 1. Try to find a valid random move near the center or existing stones
    // Simple approach: Collect all valid empty spots, pick one.
    // Optimization: Pick near existing stones.

    const validMoves: { x: number, y: number }[] = [];
    const color = state.currentPlayer;

    // Collect valid moves (naively all empty spots is too many, let's limit to neighborhood of existing stones)
    // If board is empty, pick center.
    let hasStones = false;
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (state.board[y][x] !== null) {
                hasStones = true;
                break;
            }
        }
    }

    if (!hasStones) {
        return { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };
    }

    // Find interesting spots (neighbors of existing stones)
    const candidates = new Set<string>();
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (state.board[y][x] !== null) {
                // Check neighbors
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < BOARD_SIZE && nx >= 0 && nx < BOARD_SIZE && state.board[ny][nx] === null) {
                            candidates.add(`${nx},${ny}`);
                        }
                    }
                }
            }
        }
    }

    const candidateArray = Array.from(candidates).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
    });

    // Filter by validity
    const legalMoves = candidateArray.filter(m => isValidMove(state, m.x, m.y));

    if (legalMoves.length > 0) {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Fallback: any valid move
    // Don't iterate all if we can help it. Just try random spots.
    for (let i = 0; i < 100; i++) {
        const rx = Math.floor(Math.random() * BOARD_SIZE);
        const ry = Math.floor(Math.random() * BOARD_SIZE);
        if (state.board[ry][rx] === null && isValidMove(state, rx, ry)) {
            return { x: rx, y: ry };
        }
    }

    return null;
}

function getChessMove(state: ChessGameState): { from: string, to: string, promotion?: string } | null {
    try {
        const chess = new Chess(state.fen);
        const moves = chess.moves({ verbose: true });
        if (moves.length === 0) return null;

        // Pick random move
        const move = moves[Math.floor(Math.random() * moves.length)];
        return {
            from: move.from,
            to: move.to,
            promotion: move.promotion // 'q', 'r', 'b', 'n' if promotion
        };
    } catch (e) {
        return null;
    }
}

function getGoMove(state: GoGameState): { x: number, y: number } | null {
    // Random valid move. Pass if hard to find.
    // Try N random spots.
    const color = state.currentPlayer;

    // Check if we should pass? (Randomly pass mostly never for now, unless board full)

    // Attempt to find valid move
    for (let i = 0; i < 50; i++) {
        const x = Math.floor(Math.random() * GO_BOARD_SIZE);
        const y = Math.floor(Math.random() * GO_BOARD_SIZE);

        if (isValidGoMove(state, x, y, color)) {
            return { x, y };
        }
    }

    // Scan for any valid move
    for (let y = 0; y < GO_BOARD_SIZE; y++) {
        const startX = Math.floor(Math.random() * GO_BOARD_SIZE);
        for (let i = 0; i < GO_BOARD_SIZE; i++) {
            const x = (startX + i) % GO_BOARD_SIZE;
            if (isValidGoMove(state, x, y, color)) {
                return { x, y };
            }
        }
    }

    // If no moves, Pass
    return { x: -1, y: -1 };
}
