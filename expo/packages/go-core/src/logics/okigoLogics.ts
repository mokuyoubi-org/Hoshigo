// okigoLogics.ts

import { BLACK, Board, BoardSize, Grid, MatchType } from "../types/go";
import { applyMove, initBoard, makeGrid } from "./goLogics";

// 置き碁用Board生成（1次元Grid対応）
export const generateOkigoBoard = (
  matchType: MatchType,
  boardSize: BoardSize,
): Board => {
  let board = initBoard(boardSize);
  const m = (r: number, c: number) => makeGrid(r, c, boardSize);

  if (boardSize === 9) {
    const okiishiGrids: Record<MatchType, Grid[]> = {
      0: [],
      1: [],
      2: [m(3, 7), m(7, 3)],
      3: [m(3, 7), m(7, 3), m(7, 7)],
      4: [m(3, 3), m(7, 7), m(7, 3), m(3, 7)],
      5: [m(3, 3), m(7, 7), m(7, 3), m(3, 7), m(5, 5)],
      6: [],
      7: [],
      8: [],
      9: [],
      13: [],
      16: [],
      25: [],
    };
    for (const grid of okiishiGrids[matchType] ?? []) {
      board = applyMove(boardSize, grid, board, BLACK).board;
    }
  } else if (boardSize === 13) {
    const okiishiGrids: Record<MatchType, Grid[]> = {
      0: [],
      1: [],
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
      13: [],
      16: [],
      25: [],
    };
    for (const grid of okiishiGrids[matchType] ?? []) {
      board = applyMove(boardSize, grid, board, BLACK).board;
    }
  } else if (boardSize === 19) {
    const okiishiGrids: Record<MatchType, Grid[]> = {
      0: [],
      1: [],
      2: [m(4, 16), m(16, 4)],
      3: [m(4, 16), m(16, 4), m(16, 16)],
      4: [m(4, 4), m(16, 16), m(16, 4), m(4, 16)],
      5: [m(4, 4), m(16, 16), m(16, 4), m(4, 16), m(10, 10)],
      6: [m(4, 4), m(16, 16), m(16, 4), m(4, 16), m(10, 4), m(10, 16)],
      7: [
        m(4, 4),
        m(16, 16),
        m(16, 4),
        m(4, 16),
        m(10, 10),
        m(10, 4),
        m(10, 16),
      ],
      8: [
        m(4, 4),
        m(16, 16),
        m(16, 4),
        m(4, 16),
        m(10, 4),
        m(10, 16),
        m(16, 10),
        m(4, 10),
      ],
      9: [
        m(4, 4),
        m(4, 10),
        m(4, 16),
        m(10, 4),
        m(10, 10),
        m(10, 16),
        m(16, 4),
        m(16, 10),
        m(16, 16),
      ],
      13: [
        m(4, 4),
        m(4, 10),
        m(4, 16),
        m(10, 4),
        m(10, 10),
        m(10, 16),
        m(16, 4),
        m(16, 10),
        m(16, 16),

        m(7, 7),
        m(7, 13),
        m(13, 7),
        m(13, 13),
      ],
      16: [
        m(4, 4),
        m(4, 8),
        m(4, 12),
        m(4, 16),
        m(8, 4),
        m(8, 8),
        m(8, 12),
        m(8, 16),
        m(12, 4),
        m(12, 8),
        m(12, 12),
        m(12, 16),
        m(16, 4),
        m(16, 8),
        m(16, 12),
        m(16, 16),
      ],
      25: [
        m(4, 4),
        m(4, 7),
        m(4, 10),
        m(4, 13),
        m(4, 16),

        m(7, 4),
        m(7, 7),
        m(7, 10),
        m(7, 13),
        m(7, 16),

        m(10, 4),
        m(10, 7),
        m(10, 10),
        m(10, 13),
        m(10, 16),

        m(13, 4),
        m(13, 7),
        m(13, 10),
        m(13, 13),
        m(13, 16),

        m(16, 4),
        m(16, 7),
        m(16, 10),
        m(16, 13),
        m(16, 16),
      ],
    };
    for (const grid of okiishiGrids[matchType] ?? []) {
      board = applyMove(boardSize, grid, board, BLACK).board;
    }
  }
  return board;
};
