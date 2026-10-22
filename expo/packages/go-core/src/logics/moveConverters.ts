// moveConverters.ts

import {
  BLACK,
  BoardSize,
  Color,
  Grid,
  isNoOkiishi,
  MatchType,
  MoveObject,
  PASS_GRID,
  WHITE,
} from "../types/go";
import { getOppositeColor } from "./goLogics";
import { generateOkigoBoard } from "./okigoLogics";

// Grid[] ▶︎ MoveObject[]
export const movesToMoveObjects = (
  moves: Grid[],
  boardSize: BoardSize,
  matchType: MatchType,
): MoveObject[] => {
  const moveObjects: MoveObject[] = generateMoveObjects(boardSize, matchType);
  let playerColor: Color = isNoOkiishi(matchType) ? BLACK : WHITE;

  for (const move of moves) {
    if (move === PASS_GRID) {
      moveObjects.push({ x: -1, y: -1, player: playerColor });
    } else {
      const x = (move % boardSize) + 1;
      const y = Math.floor(move / boardSize) + 1;
      moveObjects.push({ x, y, player: playerColor });
    }
    playerColor = getOppositeColor(playerColor);
  }
  return moveObjects;
};

// 2026/09/19修正
// 大事!!!!!!!!!⚠️⚠️⚠️⚠️⚠️⚠️⚠️useKataGoで使われている。
// 置き碁用 MoveObject[] の生成
const generateMoveObjects = (
  boardSize: BoardSize,
  matchType: MatchType,
): MoveObject[] => {
  if (isNoOkiishi(matchType)) return [];

  const passWhite: MoveObject = { x: -1, y: -1, player: WHITE };

  const okigoBoard = generateOkigoBoard(matchType, boardSize);
  const result: MoveObject[] = [];

  for (const [keyStr, goString] of Object.entries(okigoBoard)) {
    if (goString?.color === BLACK) {
      if (result.length > 0) result.push(passWhite);
      // 修正：currentPlayer ではなく BLACK を直接渡す⚠️⚠️⚠️⚠️⚠️⚠️ここが大事
      result.push(gridToMoveObject(Number(keyStr), boardSize, BLACK));
    }
  }
  return result;
};

// Grid ▶︎ MoveObject
const gridToMoveObject = (
  grid: Grid,
  boardSize: BoardSize,
  currentPlayer: Color,
): MoveObject => {
  if (grid === PASS_GRID) {
    return {
      x: -1,
      y: -1,
      player: currentPlayer,
    };
  }

  // マスの番号から、横の場所（x）と縦の場所（y）を計算する
  const x = (grid % boardSize) + 1;
  const y = Math.floor(grid / boardSize) + 1;

  // 計算した結果をまとめて返す
  return {
    x: x,
    y: y,
    player: currentPlayer,
  };
};
