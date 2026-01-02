import { BOARD_SIZE, RenjuGameState, PlayerColor, GameState } from '../types';

export function createInitialState(): RenjuGameState {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  return {
    type: 'renju',
    board,
    currentPlayer: 'black', // Black always moves first
    winner: null,
    history: [],
    lastMoveTime: Date.now()
  };
}

export function makeRenjuMove(state: RenjuGameState, x: number, y: number, color: PlayerColor, duration: number): RenjuGameState {
  const newState = { ...state };
  newState.board = state.board.map(row => [...row]);
  newState.board[y][x] = color;
  newState.history = [...state.history, { x, y, color, duration }];

  // Win check should be done by caller or here? Caller currently does it.
  // Ideally we encapsulate it here. But server.ts logic is doing it.
  // Let's just return state with updated board and history for now to match server expectation of "helper".
  // Actually server.ts calls checkWin separately.

  newState.currentPlayer = state.currentPlayer === 'black' ? 'white' : 'black';
  newState.lastMoveTime = Date.now();

  // We need to re-run checkWin here if we want full encapsulation, but server.ts handles it.
  // server.ts expects to modify room.gameState.
  // Let's just let server.ts handle the status update, but we return the new state structure.

  return newState;
}

export function isValidMove(state: RenjuGameState, x: number, y: number): boolean {
  if (state.winner) return false;
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;
  if (state.board[y][x] !== null) return false;
  // TODO: Add full Renju forbidden move checks for Black (Double-3, Double-4)
  // Currently checking Overline in checkWin logic roughly
  return true;
}

export function checkWin(
  board: (PlayerColor | null)[][],
  x: number,
  y: number,
  color: PlayerColor
): PlayerColor | null | 'draw' {
  // Directions: Horizontal, Vertical, Diagonal 1 (\), Diagonal 2 (/)
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    // Check forward
    let i = 1;
    while (true) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || board[ny][nx] !== color) break;
      count++;
      i++;
    }
    // Check backward
    i = 1;
    while (true) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || board[ny][nx] !== color) break;
      count++;
      i++;
    }

    if (color === 'white') {
      if (count >= 5) return 'white';
    } else {
      // Black: strictly 5. 6+ is overline (forbidden), but in simplified implementation we might just say "not a win" or "white wins"
      // Rules usually say if Black makes an overline, Black loses immediately. 
      // Ideally we prevent the move, but here we are checking *after* the move if it won.
      // If we allowed the move, and it's 5, it's a win.
      // If it's > 5 (Overline), it's a forbidden move. If we validate strictly, isValidMove should catch this.
      // For this step, let's treat 5 as win.
      if (count === 5) return 'black';
    }
  }

  // Check draw (board full)
  const isFull = board.every(row => row.every(cell => cell !== null));
  if (isFull) return 'draw';

  return null;
}
