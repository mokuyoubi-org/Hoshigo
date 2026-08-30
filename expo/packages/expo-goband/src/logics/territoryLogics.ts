// territoryLogics.ts

import {
  finalTerritoryScore,
  LocScore,
  territoryScoring,
} from "../services/goscorer";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  KOMI,
  MatchType,
  WHITE,
} from "../types/go";
import { boardToBoard2D } from "./boardConverters";

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
  matchType: MatchType,
  blackAgehama: number,
  whiteAgehama: number,
): { territoryBoard: TerritoryBoard; result: string } => {
  const komi = matchType === 0 ? KOMI : 0; // matchtype0つまり互先なら
  const stones: Color[][] = boardToBoard2D(board, boardSize);
  const markedDead: boolean[][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => false),
  );
  const territoryBoard: TerritoryBoard = initTerritoryBoard(boardSize);

  for (const grid of deadStones) {
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
    komi,
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

  if (finalScore.black === finalScore.white) {
    return { territoryBoard, result: `DRAW` };
  } else if (finalScore.black > finalScore.white) {
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
