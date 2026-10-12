// endsWithDoublePass.ts
//
// ─── このファイルの責務 ───────────────────────────────
// 「直近2手が連続パス(=終局)か？」を判定する唯一の場所。
// ──────────────────────────────────────────────────

import { Grid, PASS_GRID } from "go-core";

export const endsWithDoublePass = (moves: Grid[]): boolean => {
  const len = moves.length;
  return (
    len >= 2 && moves[len - 1] === PASS_GRID && moves[len - 2] === PASS_GRID
  );
};