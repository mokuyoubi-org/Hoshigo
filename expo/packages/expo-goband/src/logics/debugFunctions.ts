import { BLACK, Board, BoardSize, WHITE } from "../types/go";

export function printDebugBoard(board: Board, boardSize: BoardSize) {
  // 19×19の盤面を作る（19行分ループ）
  for (let row = 0; row < boardSize; row++) {
    let line = "";
    for (let col = 0; col < boardSize; col++) {
      const index = row * boardSize + col;
      const cell = board[index];

      if (!cell) {
        line += ". "; // 空マス
      } else if (cell.color === BLACK) {
        line += "x "; // 黒石
      } else if (cell.color === WHITE) {
        line += "o "; // 白石
      } else {
        line += "? ";
      }
    }
    // 1行ずつログに出力する
    console.log(line);
  }
}
