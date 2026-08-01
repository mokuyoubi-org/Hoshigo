// @/src/active/logics/goHelpers.ts

import {
  applyMove,
  cloneBoard,
  getOppositeColor,
  initBoard,
  makeGrid,
} from "@/src/active/logics/goLogics";
import { Agehama } from "@/src/active/types/matchTypes";
import {
  finalTerritoryScore,
  LocScore,
  territoryScoring,
} from "@/src/stable/services/goscorer/goscorer.js";
import { FloatArray } from "@/src/stable/services/web-katrain/types";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  EMPTY,
  GoString,
  Grid,
  KataGoMove,
  MatchType,
  PASS_GRID,
  WHITE,
} from "@/src/stable/types/goTypes";

// Board ▶︎ 2次元配列 (board2D)
export const boardToBoard2D = (board: Board, boardSize: BoardSize): Board2D => {
  const stones: Board2D = initBoard2D(boardSize);

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const grid: Grid = r * boardSize + c;
      const goString = board[grid];

      if (goString?.color === BLACK) {
        stones[r][c] = BLACK;
      } else if (goString?.color === WHITE) {
        stones[r][c] = WHITE;
      } else {
        stones[r][c] = EMPTY;
      }
    }
  }
  return stones;
};

// Grid[] (0~80の配列) ▶︎ Board[] & Agehama[]
export const movesToBoardHistory = (
  boardSize: BoardSize,
  matchType: number,
  moves: Grid[],
): { boardHistory: Board[]; agehamaHistory: Agehama[] } => {
  let boardHistory: Board[] = [];

  let board: Board = initBoard(boardSize);
  let color: Color = BLACK;
  if (matchType !== 0 && matchType !== 1) {
    board = generateOkigoBoard(matchType, boardSize);
    color = WHITE;
  }
  boardHistory = [board];
  let agehamaHistory: Agehama[] = [{ black: 0, white: 0 }];

  for (const move of moves) {
    if (move === PASS_GRID) {
      boardHistory.push(cloneBoard(board));
      const lastAgehama = agehamaHistory[agehamaHistory.length - 1];
      agehamaHistory.push({ ...lastAgehama });
      color = getOppositeColor(color);
    } else {
      const result = applyMove(boardSize, move, cloneBoard(board), color);
      board = result.board;
      const agehamaCount = result.agehama;
      const lastAgehama = agehamaHistory[agehamaHistory.length - 1];

      if (color === BLACK) {
        agehamaHistory.push({
          black: lastAgehama.black + agehamaCount,
          white: lastAgehama.white,
        });
      } else {
        agehamaHistory.push({
          black: lastAgehama.black,
          white: lastAgehama.white + agehamaCount,
        });
      }
      boardHistory.push(board);
      color = getOppositeColor(color);
    }
  }

  return { boardHistory, agehamaHistory };
};

// board2D用の空の盤面を生成
type Board2dType = typeof EMPTY | typeof BLACK | typeof WHITE;
export type Board2D = Board2dType[][];
const initBoard2D = (boardSize: BoardSize): Board2D => {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
};

// TerritoryBoard用の定義
const BLACK_TERRITORY = 1;
const WHITE_TERRITORY = 2;
const DEAD_STONE = 3;
type TerritoryType =
  | 0
  | typeof BLACK_TERRITORY
  | typeof WHITE_TERRITORY
  | typeof DEAD_STONE;
export type TerritoryBoard = TerritoryType[][];

const initTerritoryBoard = (boardSize: BoardSize): TerritoryBoard => {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
};

// 地計算ボードの生成
export const generateTerritoryBoard = (
  boardSize: BoardSize,
  board: Board,
  deadStones: Grid[],
  matchType: number,
  blackAgehama: number,
  whiteAgehama: number,
): { territoryBoard: TerritoryBoard; result: string } => {
  let KM: number = matchType === 0 || matchType === 1 ? 6.5 : 0;
  const stones: Color[][] = boardToBoard2D(board, boardSize);
  const markedDead: boolean[][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => false),
  );
  const territoryBoard: TerritoryBoard = initTerritoryBoard(boardSize);

  for (let grid of deadStones) {
    const row = Math.floor(grid / boardSize);
    const col = grid % boardSize;
    territoryBoard[row][col] = DEAD_STONE;
    markedDead[row][col] = true;
  }

  const finalScore = finalTerritoryScore(
    stones,
    markedDead,
    blackAgehama,
    whiteAgehama,
    KM,
  );
  const scoring: LocScore[][] = territoryScoring(stones, markedDead);

  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (territoryBoard[i][j] === DEAD_STONE) continue;
      if (scoring[i][j].isTerritoryFor === BLACK) {
        territoryBoard[i][j] = BLACK_TERRITORY;
      } else if (scoring[i][j].isTerritoryFor === WHITE) {
        territoryBoard[i][j] = WHITE_TERRITORY;
      }
    }
  }

  if (finalScore.black > finalScore.white) {
    return {
      territoryBoard,
      result: `B+${finalScore.black - finalScore.white}`,
    };
  } else {
    return {
      territoryBoard,
      result: `W+${finalScore.white - finalScore.black}`,
    };
  }
};

// 置き碁用Board生成（1次元Grid対応）
export const generateOkigoBoard = (
  matchType: number,
  boardSize: BoardSize,
): Board => {
  let board = initBoard(boardSize);
  const m = (r: number, c: number) => makeGrid(r, c, boardSize);

  if (boardSize === 9) {
    const points: Record<number, Grid[]> = {
      2: [m(3, 7), m(7, 3)],
      3: [m(3, 7), m(7, 3), m(7, 7)],
      4: [m(3, 3), m(7, 7), m(7, 3), m(3, 7)],
      5: [m(3, 3), m(7, 7), m(7, 3), m(3, 7), m(5, 5)],
    };
    for (const pt of points[matchType] ?? []) {
      board = applyMove(boardSize, pt, board, BLACK).board;
    }
  } else if (boardSize === 13) {
    const points: Record<number, Grid[]> = {
      2: [m(4, 10), m(10, 4)],
      3: [m(4, 10), m(10, 4), m(10, 10)],
      4: [m(4, 4), m(10, 10), m(10, 4), m(4, 10)],
      5: [m(4, 4), m(10, 10), m(10, 4), m(4, 10), m(7, 7)],
      6: [m(4, 4), m(10, 10), m(10, 4), m(4, 10), m(7, 4), m(7, 10)],
      7: [m(4, 4), m(10, 10), m(10, 4), m(4, 10), m(7, 7), m(7, 4), m(7, 10)],
      8: [
        m(4, 4),
        m(10, 10),
        m(10, 4),
        m(4, 10),
        m(7, 4),
        m(7, 10),
        m(10, 7),
        m(4, 7),
      ],
      9: [
        m(4, 4),
        m(10, 10),
        m(10, 4),
        m(4, 10),
        m(7, 7),
        m(7, 4),
        m(7, 10),
        m(10, 7),
        m(4, 7),
      ],
    };
    for (const pt of points[matchType] ?? []) {
      board = applyMove(boardSize, pt, board, BLACK).board;
    }
  }
  return board;
};

// 置き碁用 KataGoMove[] の生成
const generateKataGoMoves = (
  boardSize: BoardSize,
  matchType: MatchType,
): KataGoMove[] => {
  if (matchType === 0 || matchType === 1) return [];

  // KataGoの座標 (x:列, y:行) - 1次元インデックスを1-basedに変換してセット
  const toKata = (grid: Grid): KataGoMove => ({
    x: (grid % boardSize) + 1,
    y: Math.floor(grid / boardSize) + 1,
    player: BLACK,
  });
  const passWhite: KataGoMove = { x: -1, y: -1, player: WHITE };

  const okigoBoard = generateOkigoBoard(matchType, boardSize);
  const result: KataGoMove[] = [];

  for (const [keyStr, goString] of Object.entries(okigoBoard)) {
    if (goString?.color === BLACK) {
      if (result.length > 0) result.push(passWhite);
      result.push(toKata(Number(keyStr)));
    }
  }
  return result;
};

// Grid[] ▶︎ KataGoMove[]
export const movesToKataGoMoves = (
  moves: Grid[],
  boardSize: BoardSize,
  matchType: MatchType,
): KataGoMove[] => {
  let kataGoMoves: KataGoMove[] = generateKataGoMoves(boardSize, matchType);
  let playerColor: Color = matchType === 0 || matchType === 1 ? BLACK : WHITE;

  for (const move of moves) {
    if (move === PASS_GRID) {
      kataGoMoves.push({ x: -1, y: -1, player: playerColor });
    } else {
      const x = (move % boardSize) + 1;
      const y = Math.floor(move / boardSize) + 1;
      kataGoMoves.push({ x, y, player: playerColor });
    }
    playerColor = getOppositeColor(playerColor);
  }
  return kataGoMoves;
};

// Board からユニークな GoString 一覧を取得する
const getGoStrings = (board: Board): GoString[] => {
  const seen = new Set<GoString>();
  for (const goString of Object.values(board)) {
    if (goString !== null) seen.add(goString);
  }
  return Array.from(seen);
};

// 盤面とownershipから死に石を判定する
export const generateDeadStones = (
  board: Board,
  ownership: FloatArray,
  boardSize: BoardSize,
): Grid[] => {
  let deadStones: Grid[] = [];
  for (const goString of getGoStrings(board)) {
    const stoneIndexes = [...goString.stones];
    let ownershipSum = 0;
    for (const idx of stoneIndexes) {
      ownershipSum += ownership[idx];
    }
    const ownershipAvg = ownershipSum / stoneIndexes.length;

    if (
      (goString.color === BLACK && ownershipAvg < -0.6) ||
      (goString.color === WHITE && ownershipAvg > 0.6)
    ) {
      deadStones.push(...stoneIndexes);
    }
  }
  return deadStones;
};

export const colorToDbString = (color: Color): "black" | "white" =>
  color === BLACK ? "black" : "white";

export const colorFromDbString = (value: string): Color =>
  value === "black" ? BLACK : WHITE;
