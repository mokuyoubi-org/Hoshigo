// boardConverters.ts

import {
  Agehama,
  BLACK,
  Board,
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

export type Board2D = Color[][];

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

// Grid[] (0~80の配列) ▶︎ Board[] & Agehama[]
export const movesToBoardHistory = (
  boardSize: BoardSize,
  matchType: MatchType,
  moves: Grid[],
): { boardHistory: Board[]; agehamaHistory: Agehama[] } => {
  let boardHistory: Board[] = [];

  let board: Board = initBoard(boardSize);
  let color: Color = BLACK;
  if (!isNoOkiishi(matchType)) {
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
