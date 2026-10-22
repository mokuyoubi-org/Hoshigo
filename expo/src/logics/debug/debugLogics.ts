// import { BLACK, Board, BoardSize, Color, Grid, WHITE } from "go-core";

// export const printCustomKataGoResult = (
//   board: Board,
//   moves: Grid[],
//   currentPlayer: Color,
//   result: any,
//   boardSize: BoardSize,
// ): void => {

//   // 1. moves（数字の配列）を gridToMoveObject で {x, y} の形に変換する
//   // const formattedInputMoves = moves.map((grid: number) => {
//   //   const moveObj = gridToMoveObject(grid, boardSize, currentPlayer);
//   //   return { x: moveObj.x, y: moveObj.y };
//   // });

//   // console.log("受け取った情報:");
//   // printDebugBoard(board);
//   // console.log("moves: ", JSON.stringify(formattedInputMoves));
//   // console.log("currentPlayer: ", currentPlayer);

//   // console.log("出力情報:");
//   // 小数を第2位で切り捨てるおまじない
//   const trunc = (val: number): number => Math.floor(val * 100) / 100;

//   // 2. moves を 0~4 まで取得して、1行ずつのJSON文字列にする！
//   // const movesFormatted = result.moves
//   //   .slice(0, 10) // ここを10に
//   //   .map((m: any) => {
//   //     const item = {
//   //       order: m.order,
//   //       winRate: trunc(m.winRate),
//   //       x: m.x,
//   //       y: m.y,
//   //     };
//   //     return JSON.stringify(item);
//   //   })
//   //   .join(", \n");

//   // 3. ownership の配列内の小数をまとめて切り捨てる（1行にまとめる！）
//   // const ownershipFormatted = JSON.stringify(result.ownership.map(trunc));

//   // 4. フォーマットに組み立てる
//   const output =
//     // `{"moves": [\n` +
//     // `${movesFormatted}], \n` +
//     // `"ownership": ${ownershipFormatted}, \n` +
//     `"scoreLead": ${trunc(result.scoreLead)}, \n` +
//     `"winRate": ${trunc(result.winRate)}}`;

//   console.log("katagoの返答: " + output);
// };

// export const printDebugBoard = (board: Board) => {
//   let boardSize;
//   if (board.length === 25) {
//     boardSize = 5;
//   } else if (board.length === 81) {
//     boardSize = 9;
//   } else if (board.length === 169) {
//     boardSize = 13;
//   } else if (board.length === 361) {
//     boardSize = 19;
//   } else {
//     return;
//   }

//   // 盤面全体をひとつの文字列にまとめるための配列
//   const lines: string[] = [];

//   // 盤面を作る
//   for (let row = 0; row < boardSize; row++) {
//     let line = "";
//     for (let col = 0; col < boardSize; col++) {
//       const index = row * boardSize + col;
//       const cell = board[index];

//       if (!cell) {
//         line += ". "; // 空マス
//       } else if (cell.color === BLACK) {
//         line += "x "; // 黒石
//       } else if (cell.color === WHITE) {
//         line += "o "; // 白石
//       } else {
//         line += "? ";
//       }
//     }
//     // 配列に1行分の文字列を入れる
//     lines.push(line);
//   }

//   // 改行でつないで、1回だけログに出力する！
//   console.log(lines.join("\n"));
// };
