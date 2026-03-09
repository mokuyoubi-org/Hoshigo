import { Agehama } from "../constants/goConstants";
import {
  applyMove,
  Board,
  cloneBoard,
  Color,
  initializeBoard,
  keyToGrid,
} from "./goLogics";
import {
  BLACK,
  EMPTY,
  finalTerritoryScore,
  LocScore,
  territoryScoring,
  WHITE,
} from "./goscorer.js";

export const movesToSgf = (
  moves: string[],
  matchType: number = 0,
  startingColor: "B" | "W" = "B",
  boardSize: number = 9,
): string => {
  const alphabet = "0abcdefghijklmnopqrstuvwxyz";
  // 🎯 コミ決定
  const komi = matchType === 0 ? 6.5 : 0;

  // 🎯 2子局以上なら白スタート
  let color: "B" | "W" = matchType >= 2 ? "W" : startingColor;

  let sgf = `(;GM[1]FF[4]SZ[${boardSize}]RU[Japanese]KM[${komi}]`;

  // 🎯 HA追加（2子局以上）
  if (matchType >= 2) {
    sgf += `HA[${matchType}]`;
  }

  sgf += "\n";

  for (const move of moves) {
    // パスなら
    if (move === "p") {
      sgf += `;${color}[]`;
    }
    // 着手なら
    else {
      const [rowStr, colStr] = move.split(",");
      const row = parseInt(rowStr, 10); // 文字列の"3"を数字の3にしてるみたいなこと。10は10進数っていうこと。
      const col = parseInt(colStr, 10);
      const sgfCol = alphabet[col];
      const sgfRow = alphabet[row];
      sgf += `;${color}[${sgfCol}${sgfRow}]`;
    }

    // 色を交互に切り替え
    color = color === "B" ? "W" : "B";
  }

  // sgfファイルの終わり
  sgf += ")";
  return sgf;
};

export function formatResult(result: string): string {
  const match = result.match(/(Black|White) wins by ([0-9.]+) points/);

  if (!match) return result; // 形が違ったらそのまま返す

  const color = match[1] === "Black" ? "B" : "W";
  const points = match[2];

  return `${color}+${points}`;
}

// // // // // // // // // // // // // // // // // //
//        　　　　 デ　　バ　　ッ　　グ　　              //
// // // // // // // // // // // // // // // // // //

// export const printBoard = (board: Board) => {
//   console.log("=== 連のサイズ ===");
//   for (let row = 1; row <= BOARD_SIZE_COUNT; row++) {
//     let line = "";
//     for (let col = 1; col <= BOARD_SIZE_COUNT; col++) {
//       const cell = board[`${row},${col}`];
//       line += cell ? `${cell.stones.size} ` : "0 ";
//     }
//     console.log(`${row}: ${line}`);
//   }

//   console.log("=== 呼吸点の数 ===");
//   for (let row = 1; row <= BOARD_SIZE_COUNT; row++) {
//     let line = "";
//     for (let col = 1; col <= BOARD_SIZE_COUNT; col++) {
//       const cell = board[`${row},${col}`];
//       line += cell ? `${cell.liberties.size} ` : "0 ";
//     }
//     console.log(`${row}: ${line}`);
//   }
// };

// 要はシンプルな二次元配列にしている。012のみの。
export function boardToStones(board: Board, boardSize: number): number[][] {
  const stones: number[][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => 0),
  );

  for (const key in board) {
    const goString = board[key];
    const [rowStr, colStr] = key.split(",");
    const row = parseInt(rowStr, 10) - 1;
    const col = parseInt(colStr, 10) - 1;
    if (goString?.color === "black") {
      stones[row][col] = BLACK;
    } else if (goString?.color === "white") {
      stones[row][col] = WHITE;
    } else {
      stones[row][col] = EMPTY;
    }
  }
  return stones;
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const resultToLanguagesComment = (
  result: string,
  playerColor: string,
    t: (key: string, params?: any) => string

) => {
  if (
    (result === "W+R" && playerColor === "white") ||
    (result === "B+R" && playerColor === "black")
  ) {
    return t("GameResult.yourResignationWin");
  } else if (
    (result === "W+R" && playerColor === "black") ||
    (result === "B+R" && playerColor === "white")
  ) {
    return t("GameResult.yourResignationLoss");
  } else if (
    (result === "W+T" && playerColor === "white") ||
    (result === "B+T" && playerColor === "black")
  ) {
    return t("GameResult.yourTimeoutWin");
  } else if (
    (result === "W+T" && playerColor === "black") ||
    (result === "B+T" && playerColor === "white")
  ) {
    return t("GameResult.yourTimeoutLoss");
  } else if (
    (result === "W+C" && playerColor === "white") ||
    (result === "B+C" && playerColor === "black")
  ) {
    return t("GameResult.yourDisconnectWin");
  } else if (
    (result === "W+C" && playerColor === "black") ||
    (result === "B+C" && playerColor === "white")
  ) {
    return t("GameResult.yourDisconnectLoss");
  } else if (
    (result[0] === "B" && playerColor === "black") ||
    (result[0] === "W" && playerColor === "white")
  ) {
    const points = result.slice(2);
    console.log(t("GameResult.yourPointsWin", { points }));
    return t("GameResult.yourPointsWin", { points });
  } else if (
    (result[0] === "W" && playerColor === "black") ||
    (result[0] === "B" && playerColor === "white")
  ) {
    const points = result.slice(2);
    console.log(t("GameResult.yourPointsLoss", { points }));
    return t("GameResult.yourPointsLoss", { points });
  } else {
    return;
  }
};

export function isStringJSON(v: string) {
  try {
    JSON.parse(v);
    return true;
  } catch {
    return false;
  }
}

export const gnuGridtoStringGrid = (sgfStyleGrid: string) => {
  // "A1"みたいなやつを"9,1"にする
  const alphabet = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
  const row = 9 - Number(sgfStyleGrid[1]);
  const col = alphabet.indexOf(sgfStyleGrid[0]);
  return `${row + 1},${col + 1}`;
};

export const gnuGridstoStringGrids = (sgfStyleGrids: string[]): string[] => {
  let arr: string[] = [];
  for (let gnugoStyleGrid of sgfStyleGrids) {
    let str = gnuGridtoStringGrid(gnugoStyleGrid);
    arr.push(str);
  }
  return arr;
};

export const movesToBoardHistory = (
  boardSize: number,
  matchType: number,
  moves: string[],
): { boardHistory: Board[]; agehamaHistory: Agehama[] } => {
  let boardHistory: Board[] = [];

  let board: Board = initializeBoard(boardSize);
  let color: Color = "black";
  if (matchType !== 0 && matchType !== 1) {
    board = prepareOkigoBoard(matchType, boardSize);
    color = "white";
  }
  boardHistory = [board]; // 初期盤面
  let agehamaCount;
  let agehamaHistory: Agehama[] = [{ black: 0, white: 0 }];

  for (const move of moves) {
    console.log("move: ", move);
    if (move === "p") {
      // パスの場合、盤面は変わらないがhistoryに追加
      boardHistory = [...boardHistory, cloneBoard(board)];
      agehamaHistory = [
        ...agehamaHistory,
        {
          black: agehamaHistory[agehamaHistory.length - 1].black,
          white: agehamaHistory[agehamaHistory.length - 1].white,
        },
      ];
      color = color === "black" ? "white" : "black";
    } else if (move === "r") {
      // 投了の場合、その時点で終了
      break;
    } else {
      // 通常の着手
      const result = applyMove(
        boardSize,
        keyToGrid(move),
        cloneBoard(board),
        color,
      );

      board = result.board;
      agehamaCount = result.agehama;

      console.log("agehamaCount", agehamaCount);
      if (color === "black") {
        agehamaHistory = [
          ...agehamaHistory,
          {
            black:
              agehamaCount + agehamaHistory[agehamaHistory.length - 1].black,
            white: agehamaHistory[agehamaHistory.length - 1].white,
          },
        ];
      } else {
        agehamaHistory = [
          ...agehamaHistory,
          {
            black: agehamaHistory[agehamaHistory.length - 1].black,
            white:
              agehamaCount + agehamaHistory[agehamaHistory.length - 1].white,
          },
        ];
      }
      boardHistory = [...boardHistory, board];
      color = color === "black" ? "white" : "black";
    }
  }

  console.log("movesToBoardHistoryのreturn直前");
  console.log("agehamaHistory: ", agehamaHistory);

  return { boardHistory, agehamaHistory };
};

export type territoryBoard = number[][];
// BoardおよびdeadStones(str)を受け取ったら、territoryBoardと結果を返す関数
export const makeTerritoryBoard = (
  boardSize: number,
  board: Board,
  deadStones: string[],
  matchType: number,
  blackAgehama: number,
  whiteAgehama: number,
): { territoryBoard: number[][]; result: string } => {
  let KM: number = 6.5;
  if (matchType !== 0 && matchType !== 1) {
    KM = 0;
  }
  const stones: number[][] = boardToStones(board, boardSize);
  const markedDead: boolean[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => false),
  );
  const territoryBoard: number[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => 0),
  );

  for (let stringGrid of deadStones) {
    territoryBoard[Number(stringGrid[0]) - 1][Number(stringGrid[2]) - 1] = 3; // 死に石: 3
    markedDead[Number(stringGrid[0]) - 1][Number(stringGrid[2]) - 1] = true;
  }

  const finalScore: { black: number; white: number } = finalTerritoryScore(
    stones,
    markedDead,
    blackAgehama,
    whiteAgehama,
    KM,
  );
  console.log("finalScore: ", finalScore);
  // detailed territory map
  const scoring: LocScore[][] = territoryScoring(stones, markedDead);

  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (territoryBoard[i][j] === 3) continue; // 死に石はスキップ
      if (scoring[i][j].isTerritoryFor === BLACK) {
        territoryBoard[i][j] = BLACK; // 黒の陣地: 1
      } else if (scoring[i][j].isTerritoryFor === WHITE) {
        territoryBoard[i][j] = WHITE; // 白の陣地: 2
      }
    }
  }

  if (finalScore.black > finalScore.white) {
    return {
      territoryBoard: territoryBoard,
      result: `B+${finalScore.black - finalScore.white}`,
    };
  } else {
    return {
      territoryBoard: territoryBoard,
      result: `W+${finalScore.white - finalScore.black}`,
    };
  }
};

export const resultToLanguages = (result: string
,
  t: (key: string, params?: any) => string

) => {
  if (result === "B+R") {
    return t("GameResult.blackResignationWin");
  } else if (result === "W+R") {
    return t("GameResult.whiteResignationWin");
  } else if (result === "B+T") {
    return t("GameResult.blackTimeoutWin");
  } else if (result === "W+T") {
    return t("GameResult.whiteTimeoutWin");
  } else if (result === "B+C") {
    return t("GameResult.blackDisconnectWin");
  } else if (result === "W+C") {
    return t("GameResult.whiteDisconnectWin");
  } else if (result.startsWith("B+")) {
    const points = result.slice(2);
    return t("GameResult.blackPointsWin", { points });
  } else if (result.startsWith("W+")) {
    const points = result.slice(2);
    return t("GameResult.whitePointsWin", { points });
  } else return;
};

export const movesToOpeningIndex = (moves: string[]): number => {
  return 0;
};

// 二次元配列を受け取ったらそれを適用したBoardを返す関数
// 0が空、1が黒、2が白
export const prepareBoard2d = (
  board2d: number[][],
  boardSize: number = 9,
): Board => {
  let board = initializeBoard(boardSize);
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board2d[i][j] === 1) {
        // 黒
        board = applyMove(
          boardSize,
          { row: i + 1, col: j + 1 },
          board,
          "black",
        ).board;
      } else if (board2d[i][j] === 2) {
        // 白
        board = applyMove(
          boardSize,
          { row: i + 1, col: j + 1 },
          board,
          "white",
        ).board;
      }
    }
  }
  return board;
};

export const prepareOkigoBoard = (
  matchType: number,
  boardSize: number,
): Board => {
  let board = initializeBoard(boardSize);
  switch (matchType) {
    case 2: // 2子局
      board = applyMove(boardSize, { row: 3, col: 7 }, board, "black").board;
      board = applyMove(boardSize, { row: 7, col: 3 }, board, "black").board;
      break;
    case 3: // 3子局
      board = applyMove(boardSize, { row: 3, col: 7 }, board, "black").board;
      board = applyMove(boardSize, { row: 7, col: 3 }, board, "black").board;
      board = applyMove(boardSize, { row: 3, col: 3 }, board, "black").board;
      break;
    case 4: // 4子局
      board = applyMove(boardSize, { row: 3, col: 3 }, board, "black").board;
      board = applyMove(boardSize, { row: 7, col: 7 }, board, "black").board;
      board = applyMove(boardSize, { row: 7, col: 3 }, board, "black").board;
      board = applyMove(boardSize, { row: 3, col: 7 }, board, "black").board;
      break;
    case 5: // 5子局
      board = applyMove(boardSize, { row: 3, col: 3 }, board, "black").board;
      board = applyMove(boardSize, { row: 7, col: 7 }, board, "black").board;
      board = applyMove(boardSize, { row: 7, col: 3 }, board, "black").board;
      board = applyMove(boardSize, { row: 3, col: 7 }, board, "black").board;
      board = applyMove(boardSize, { row: 5, col: 5 }, board, "black").board;
      break;
  }
  return board;
};
