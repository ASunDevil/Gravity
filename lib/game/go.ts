import { GoGameState, PlayerColor, GO_BOARD_SIZE } from '../types';

export { GO_BOARD_SIZE };

export function createInitialGoState(): GoGameState {
    const board = Array(GO_BOARD_SIZE).fill(null).map(() => Array(GO_BOARD_SIZE).fill(null));
    return {
        type: 'go',
        board,
        currentPlayer: 'black',
        winner: null,
        history: [],
        captured: { black: 0, white: 0 },
        passes: 0
    };
}

// Check if a group of stones has liberties
function hasLiberties(
    board: (PlayerColor | null)[][],
    x: number,
    y: number,
    color: PlayerColor,
    visited: Set<string> = new Set()
): boolean {
    const key = `${x},${y}`;
    if (visited.has(key)) return false;
    visited.add(key);

    const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= GO_BOARD_SIZE || ny < 0 || ny >= GO_BOARD_SIZE) continue;

        const cell = board[ny][nx];
        if (cell === null) return true; // Found a liberty
        if (cell === color) {
            // Same color, recursively check
            if (hasLiberties(board, nx, ny, color, visited)) return true;
        }
    }

    return false;
}

// Find all stones in a captured group
function getGroup(
    board: (PlayerColor | null)[][],
    x: number,
    y: number,
    color: PlayerColor,
    group: { x: number, y: number }[] = [],
    visited: Set<string> = new Set()
): { x: number, y: number }[] {
    const key = `${x},${y}`;
    if (visited.has(key)) return group;
    visited.add(key);
    group.push({ x, y });

    const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= GO_BOARD_SIZE || ny < 0 || ny >= GO_BOARD_SIZE) continue;
        if (board[ny][nx] === color) {
            getGroup(board, nx, ny, color, group, visited);
        }
    }
    return group;
}

function boardsEqual(b1: (PlayerColor | null)[][], b2: (PlayerColor | null)[][]): boolean {
    for (let y = 0; y < GO_BOARD_SIZE; y++) {
        for (let x = 0; x < GO_BOARD_SIZE; x++) {
            if (b1[y][x] !== b2[y][x]) return false;
        }
    }
    return true;
}

export function isValidGoMove(state: GoGameState, x: number, y: number, color: PlayerColor): boolean {
    // Pass logic (x=-1, y=-1)
    if (x === -1 && y === -1) return true;

    if (x < 0 || x >= GO_BOARD_SIZE || y < 0 || y >= GO_BOARD_SIZE) return false;
    if (state.board[y][x] !== null) return false;

    // Simulation for Suicide and Ko
    // We must simulate to check validity strictly
    const simState = makeGoMove({ ...state }, x, y, color, true); // true = simulation mode

    // If makeGoMove returns the same board object (reference check), it means move was invalid (e.g. suicide)
    // But makeGoMove creates new board reference usually.
    // Let's modify makeGoMove to return null if invalid? 
    // Or we just check validities here by repeating some logic.

    // SUICIDE CHECK
    // 1. Copy board
    const board = state.board.map(row => [...row]);
    board[y][x] = color;
    const opponent = color === 'black' ? 'white' : 'black';

    // 2. Remove captured opponent tokens
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    let capturedAny = false;

    neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < GO_BOARD_SIZE && ny >= 0 && ny < GO_BOARD_SIZE) {
            if (board[ny][nx] === opponent && !hasLiberties(board, nx, ny, opponent)) {
                // Capture would happen
                capturedAny = true;
                // We actually need to remove them to check if *our* stone has liberties after capture
                // But simplified: If we capture, we definitely have liberties (the spot we just cleared).
            }
        }
    });

    if (!capturedAny) {
        // If no capture, check if we have liberties
        if (!hasLiberties(board, x, y, color)) {
            // Suicide
            return false;
        }
    }

    // KO CHECK
    // If we captured, board changes. If it reverts to *immediate* previous board, it's Ko.
    // We need to fully apply capture to compare boards.
    if (capturedAny && state.previousBoard) {
        // Apply captures to 'board'
        neighbors.forEach(([nx, ny]) => {
            if (nx >= 0 && nx < GO_BOARD_SIZE && ny >= 0 && ny < GO_BOARD_SIZE) {
                if (board[ny][nx] === opponent && !hasLiberties(board, nx, ny, opponent)) {
                    const group = getGroup(board, nx, ny, opponent);
                    group.forEach(s => board[s.y][s.x] = null);
                }
            }
        });

        if (boardsEqual(board, state.previousBoard)) {
            return false; // Ko rule violation
        }
    }

    return true;
}

export function makeGoMove(state: GoGameState, x: number, y: number, color: PlayerColor, simulation = false): GoGameState {
    const opponent = color === 'black' ? 'white' : 'black';

    // Handle PASS
    if (x === -1 && y === -1) {
        const newPasses = state.passes + 1;

        let winner: PlayerColor | null | 'draw' = null;
        if (newPasses >= 2) {
            // Game End
            // Ideally should do scoring. For MVP, just Draw or retain null (need manual scoring phase? or manual declare)
            // Or maybe just show 'draw' as "Game Ended"
            winner = 'draw';
        }

        return {
            ...state,
            currentPlayer: opponent,
            history: [...state.history, { x, y, color }],
            passes: newPasses,
            winner,
            // Previous board doesn't change on pass? Or strictly it remains same.
            // But Ko usually relates to *board change*.
            previousBoard: state.board
        };
    }

    // Normal Move
    const newBoard = state.board.map(row => [...row]);
    newBoard[y][x] = color;

    let capturedCount = 0;

    // Check neighbors for captures
    const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    neighbors.forEach(([nx, ny]) => {
        if (nx < 0 || nx >= GO_BOARD_SIZE || ny < 0 || ny >= GO_BOARD_SIZE) return;

        const neighborCell = newBoard[ny][nx];
        if (neighborCell === opponent) {
            if (!hasLiberties(newBoard, nx, ny, opponent)) {
                const group = getGroup(newBoard, nx, ny, opponent);
                group.forEach(stone => {
                    if (newBoard[stone.y][stone.x] !== null) {
                        newBoard[stone.y][stone.x] = null;
                        capturedCount++;
                    }
                });
            }
        }
    });

    // NOTE: isValidGoMove should be called BEFORE makeGoMove to ensure Suicide/Ko doesn't happen.
    // makeGoMove assumes valid move or is used for simulation.

    const newCaptured = { ...state.captured };
    if (color === 'black') {
        newCaptured.black += capturedCount;
    } else {
        newCaptured.white += capturedCount;
    }

    return {
        type: 'go',
        board: newBoard,
        currentPlayer: opponent,
        winner: null,
        history: [...state.history, { x, y, color }],
        captured: newCaptured,
        previousBoard: state.board, // Store state BEFORE this move (which was 'state.board')
        passes: 0 // Reset pass count on valid move
    };
}
