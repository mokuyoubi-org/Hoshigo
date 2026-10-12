// shouldBotForcePass.ts
//
// ─── このファイルの責務 ───────────────────────────────
// 「人間が連続でパスしたので、ボットも(最善手を無視して)パスすべきか？」を
// 判定する純粋関数。ボットの手番で、手を決める直前に呼ぶ。
//
// movesSoFarの末尾は「人間の手」(1手前)、その前が「ボットの手」(2手前)、
// その前が「人間の手」(3手前)…という並びになっている。
//  - 5路: レートに関わらないので、人間が2回連続パス(1手前と3手前)で強制パス。
//  - 9/13/19路: レートがあるので、盤面が十分進んでから(最低手数以上)、
//    人間が3回連続パス(1手前・3手前・5手前)した時だけ強制パス。
// ──────────────────────────────────────────────────

import { BoardSize, Grid, PASS_GRID } from "go-core";

// 9/13/19路で「3回連続パス」ルールを使い始める最低手数(盤の交点数の半分くらい)
const MIN_MOVES_FOR_THREE_PASSES: Partial<Record<BoardSize, number>> = {
  9: 50, // 81
  13: 100, // 169
  19: 200, // 381
};

export const shouldBotForcePass = (
  boardSize: BoardSize,
  movesSoFar: Grid[],
): boolean => {
  const len = movesSoFar.length;
  // n手前の手がパスだったか(手数が足りなければfalse)
  const passedAgo = (n: number) => movesSoFar[len - n] === PASS_GRID;

  if (boardSize === 5) {
    return passedAgo(1) && passedAgo(3);
  }

  const minMoves = MIN_MOVES_FOR_THREE_PASSES[boardSize];
  if (minMoves === undefined || len < minMoves) return false;

  return passedAgo(1) && passedAgo(3) && passedAgo(5);
};
