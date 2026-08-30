// moveConverters.ts

import {
  BLACK,
  Board,
  FloatArray,
  GoString,
  Grid,
  WHITE,
} from "../types/go";

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
  ownership: FloatArray,
): Grid[] => {
  console.log("ownership: ", ownership);
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
