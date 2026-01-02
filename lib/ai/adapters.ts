import { RenjuGameState, GoGameState, ChessGameState, BOARD_SIZE, GO_BOARD_SIZE } from '../types';
import { Chess } from 'chess.js';

export function renjuToAscii(state: RenjuGameState): string {
    let boardStr = "   A B C D E F G H I J K L M N O\n";
    for (let y = 0; y < BOARD_SIZE; y++) {
        // Row 0 is "15", Row 14 is "1"
        const label = (BOARD_SIZE - y).toString().padStart(2, ' ');
        boardStr += label + " ";
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = state.board[y][x];
            boardStr += (cell === 'black' ? 'X' : (cell === 'white' ? 'O' : '.')) + " ";
        }
        boardStr += "\n";
    }
    return boardStr;
}

export function chessToFenAndMoves(state: ChessGameState): string {
    const chess = new Chess(state.fen);
    const moves = chess.moves();
    return `FEN: ${state.fen}\nValid Moves: ${moves.join(', ')}`;
}

export function goToAscii(state: GoGameState): string {
    let boardStr = "   A B C D E F G H J K L M N O P Q R S T\n";
    for (let y = 0; y < GO_BOARD_SIZE; y++) {
        // Row 0 is "19", Row 18 is "1"
        const label = (GO_BOARD_SIZE - y).toString().padStart(2, ' ');
        boardStr += label + " ";
        for (let x = 0; x < GO_BOARD_SIZE; x++) {
            const cell = state.board[y][x];
            boardStr += cell === 'black' ? 'X ' : (cell === 'white' ? 'O ' : '. ');
        }
        boardStr += "\n";
    }
    return boardStr;
}
