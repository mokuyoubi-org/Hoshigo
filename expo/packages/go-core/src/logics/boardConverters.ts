// boardConverters.ts

import {
  AgehamaCount,
  BLACK,
  Board,
  Board2D,
  BoardSize,
  Color,
  EMPTY,
  Grid,
  isNoOkiishi,
  MatchType,
  PASS_GRID,
  WHITE,
} from "../types/go";
import { applyMove, cloneBoard, getOppositeColor, initBoard } from "./goLogics";
import { generateOkigoBoard } from "./okigoLogics";


const initBoard2D = (boardSize: BoardSize): Board2D => {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
};

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

// Grid[] ▶︎ Board[] & AgehamaCount[]
export const movesToBoardHistory = (
  boardSize: BoardSize,
  matchType: MatchType,
  moves: Grid[],
): { boardHistory: Board[]; agehamaHistory: AgehamaCount[] } => {
  let boardHistory: Board[] = [];

  let board: Board = initBoard(boardSize);
  let color: Color = BLACK;
  if (!isNoOkiishi(matchType)) {
    board = generateOkigoBoard(matchType, boardSize);
    color = WHITE;
  }
  boardHistory = [board];
  let agehamaHistory: AgehamaCount[] = [{ black: 0, white: 0 }];

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

// Grid[] (0~80の配列) ▶︎ 最終局面の Board & AgehamaCount
export const movesToFinalBoard = (
  boardSize: BoardSize,
  matchType: MatchType,
  moves: Grid[],
): { board: Board; agehama: AgehamaCount } => {
  let board: Board = initBoard(boardSize);
  let color: Color = BLACK;

  if (!isNoOkiishi(matchType)) {
    board = generateOkigoBoard(matchType, boardSize);
    color = WHITE;
  }

  let agehama: AgehamaCount = { black: 0, white: 0 };

  for (const move of moves) {
    if (move === PASS_GRID) {
      // パスの時は石の形もアゲハマも変わらないから、手番だけ交代する！
      color = getOppositeColor(color);
    } else {
      const result = applyMove(boardSize, move, cloneBoard(board), color);
      board = result.board;

      if (color === BLACK) {
        agehama.black += result.agehama;
      } else {
        agehama.white += result.agehama;
      }

      color = getOppositeColor(color);
    }
  }

  // 最後に一番新しい盤面とアゲハマを返す
  return { board, agehama };
};


// 石の位置の一覧(黒・白)から、最初の局面の盤を作る。詰碁用。
// 黒を先に全部置いてから、白を置く(こうすると、呼吸点が正しく数えられる)。
export const stonesToBoard = (
  boardSize: BoardSize,
  blackStones: Grid[],
  whiteStones: Grid[],
): Board => {
  let board: Board = initBoard(boardSize);
  for (const grid of blackStones) {
    board = applyMove(boardSize, grid, board, BLACK).board;
  }
  for (const grid of whiteStones) {
    board = applyMove(boardSize, grid, board, WHITE).board;
  }
  return board;
};