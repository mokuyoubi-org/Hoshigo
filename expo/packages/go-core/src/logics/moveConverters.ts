// moveConverters.ts

import {
  BLACK,
  Board,
  BoardSize,
  Color,
  GoString,
  Grid,
  isNoOkiishi,
  MatchType,
  MoveObject,
  PASS_GRID,
  WHITE,
} from "../types/go";
import { getOppositeColor } from "./goLogics";
import { generateOkigoBoard } from "./okigoLogics";

// Board からユニークな GoString 一覧を取得する
const getGoStrings = (board: Board): GoString[] => {
  const seen = new Set<GoString>();
  for (const goString of Object.values(board)) {
    if (goString !== null) seen.add(goString);
  }
  return Array.from(seen);
};

// 死に石と判定するownership平均の閾値（超えたら「相手に取られている」とみなす）
const DEAD_STONE_OWNERSHIP_THRESHOLD = 0.6;

// 盤面とownershipから死に石を判定する
export const ownershipToDeadStones = (
  board: Board,
  ownership: any, // ここ直す🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
): Grid[] => {
  const deadStones: Grid[] = [];
  for (const goString of getGoStrings(board)) {
    const stoneIndexes = [...goString.stones];
    let ownershipSum = 0;
    for (const idx of stoneIndexes) {
      ownershipSum += ownership[idx];
    }
    const ownershipAvg = ownershipSum / stoneIndexes.length;

    if (
      (goString.color === BLACK &&
        ownershipAvg < -DEAD_STONE_OWNERSHIP_THRESHOLD) ||
      (goString.color === WHITE &&
        ownershipAvg > DEAD_STONE_OWNERSHIP_THRESHOLD)
    ) {
      deadStones.push(...stoneIndexes);
    }
  }
  console.log("deadStones: ", deadStones);
  return deadStones;
};

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
      result.push(gridToMoveObject(Number(keyStr), boardSize));
    }
  }
  return result;
};

// Grid ▶︎ MoveObject
export const gridToMoveObject = (
  grid: Grid,
  boardSize: BoardSize,
): MoveObject => ({
  x: (grid % boardSize) + 1,
  y: Math.floor(grid / boardSize) + 1,
  player: BLACK,
});
