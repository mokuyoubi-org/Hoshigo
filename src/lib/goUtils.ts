import i18n from "../services/i18n";
import {
  applyMove,
  Board,
  BOARD_SIZE_COUNT,
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
  moves: string[], // ["3,7", "2,3", ...]
  startingColor: "B" | "W" = "B",
  boardSize: number = BOARD_SIZE_COUNT,
): string => {
  const alphabet = "0abcdefghijklmnopqrstuvwxyz";
  let sgf = `(;SZ[${boardSize}]RU[Japanese]KM[6.5]\n`;
  let color: "B" | "W" = startingColor;

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

export const printBoard = (board: Board) => {
  console.log("=== 連のサイズ ===");
  for (let row = 1; row <= BOARD_SIZE_COUNT; row++) {
    let line = "";
    for (let col = 1; col <= BOARD_SIZE_COUNT; col++) {
      const cell = board[`${row},${col}`];
      line += cell ? `${cell.stones.size} ` : "0 ";
    }
    console.log(`${row}: ${line}`);
  }

  console.log("=== 呼吸点の数 ===");
  for (let row = 1; row <= BOARD_SIZE_COUNT; row++) {
    let line = "";
    for (let col = 1; col <= BOARD_SIZE_COUNT; col++) {
      const cell = board[`${row},${col}`];
      line += cell ? `${cell.liberties.size} ` : "0 ";
    }
    console.log(`${row}: ${line}`);
  }
};

// 要はシンプルな二次元配列にしている。012のみの。
export function boardToStones(
  board: Board,
  size: number = BOARD_SIZE_COUNT,
): number[][] {
  const stones: number[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0),
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
) => {
  if (
    (result === "W+R" && playerColor === "white") ||
    (result === "B+R" && playerColor === "black")
  ) {
    return i18n.t("GameResult.yourResignationWin");
  } else if (
    (result === "W+R" && playerColor === "black") ||
    (result === "B+R" && playerColor === "white")
  ) {
    return i18n.t("GameResult.yourResignationLoss");
  } else if (
    (result === "W+T" && playerColor === "white") ||
    (result === "B+T" && playerColor === "black")
  ) {
    return i18n.t("GameResult.yourTimeoutWin");
  } else if (
    (result === "W+T" && playerColor === "black") ||
    (result === "B+T" && playerColor === "white")
  ) {
    return i18n.t("GameResult.yourTimeoutLoss");
  } else if (
    (result === "W+C" && playerColor === "white") ||
    (result === "B+C" && playerColor === "black")
  ) {
    return i18n.t("GameResult.yourDisconnectWin");
  } else if (
    (result === "W+C" && playerColor === "black") ||
    (result === "B+C" && playerColor === "white")
  ) {
    return i18n.t("GameResult.yourDisconnectLoss");
  } else if (
    (result[0] === "B" && playerColor === "black") ||
    (result[0] === "W" && playerColor === "white")
  ) {
    const points = result.slice(2);
    console.log(i18n.t("GameResult.yourPointsWin", { points }));
    return i18n.t("GameResult.yourPointsWin", { points });
  } else if (
    (result[0] === "W" && playerColor === "black") ||
    (result[0] === "B" && playerColor === "white")
  ) {
    const points = result.slice(2);
    console.log(i18n.t("GameResult.yourPointsLoss", { points }));
    return i18n.t("GameResult.yourPointsLoss", { points });
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
  moves: string[],
): { boardHistory: Board[]; agehamaHistory: Agehama[] } => {
  let boardHistory: Board[] = [];
  let board: Board = initializeBoard();
  boardHistory = [board]; // 初期盤面
  let agehamaCount;
  let agehamaHistory: Agehama[] = [{ black: 0, white: 0 }];
  let color: Color = "black";

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
      const result = applyMove(keyToGrid(move), cloneBoard(board), color);

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

// BoardおよびdeadStones(str)を受け取ったら、territoryBoardと結果を返す関数
export const makeTerritoryBoard = (
  board: Board,
  deadStones: string[],
): { territoryBoard: number[][]; result: string } => {
  const stones: number[][] = boardToStones(board);
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
    0,
    0,
    6.5,
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

export const resultToLanguages = (result: string) => {
  if (result === "B+R") {
    return i18n.t("GameResult.blackResignationWin");
  } else if (result === "W+R") {
    return i18n.t("GameResult.whiteResignationWin");
  } else if (result === "B+T") {
    return i18n.t("GameResult.blackTimeoutWin");
  } else if (result === "W+T") {
    return i18n.t("GameResult.whiteTimeoutWin");
  } else if (result === "B+C") {
    return i18n.t("GameResult.blackDisconnectWin");
  } else if (result === "W+C") {
    return i18n.t("GameResult.whiteDisconnectWin");
  } else if (result.startsWith("B+")) {
    const points = result.slice(2);
    return i18n.t("GameResult.blackPointsWin", { points });
  } else if (result.startsWith("W+")) {
    const points = result.slice(2);
    return i18n.t("GameResult.whitePointsWin", { points });
  } else return;
};

export type Agehama = {
  black: number;
  white: number;
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
  let board = initializeBoard();
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board2d[i][j] === 1) {
        // 黒
        board = applyMove({ row: i + 1, col: j + 1 }, board, "black").board;
      } else if (board2d[i][j] === 2) {
        // 白
        board = applyMove({ row: i + 1, col: j + 1 }, board, "white").board;
      }
    }
  }
  return board;
};
