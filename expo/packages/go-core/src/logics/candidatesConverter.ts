// candidatesConverter.ts
//
// ─── この関数の責務 ───────────────────────────────────
// KataGoの候補手から、bot・盤サイズに応じて「抽選に出してよい手」だけを残す(書類選考)。
// 重みを使ったくじ引きは botSelectMove.ts の仕事。
// ──────────────────────────────────────────────────

import { BoardSize, Grid, PASS_GRID } from "../types/go";
import { toPercent } from "./toPercent";

export type KataGoCandidate = {
  grid: Grid;
  winRate: number; // 0-100の整数、黒視点
};
// 勝率を *% 以上下げる手は一律禁止
const WINRATE_CUTOFF = 10;

// パス判定・端っこ判定。isValidCandidateから使う。
const isPass = (grid: Grid) => grid === PASS_GRID;
const isNearEdge = (grid: Grid, boardSize: BoardSize) =>
  grid < boardSize * 2 ||
  grid > boardSize * (boardSize - 2) ||
  grid % boardSize === 0 ||
  grid % boardSize === 1 ||
  grid % boardSize === boardSize - 2 ||
  grid % boardSize === boardSize - 1;

// 候補手が抽選対象として有効かどうかを判定する。
// 禁止条件を上から順番に弾いていく書き方にして、
// 「パスなら禁止」「端っこは最善手以外禁止」を素直に読めるようにしている。
const isValidCandidate = (
  grid: Grid,
  bestMove: Grid,
  boardSize: BoardSize,
): boolean => {
  if (isPass(grid)) return false; // パスは常に禁止
  if (
    isNearEdge(grid, boardSize) &&
    grid !== bestMove // ⚠️ここが大事！！！端っこ付近だとしても、それが最善手なら当然打つ
  )
    return false; // 変な端っこ打ちは禁止しておく。ただし最善手なら許可
  return true;
};

// 最善手を返す。
// passForbidden = true の時は、最善手も「パス以外の先頭」にする。
export const findBestMove = (candidates: KataGoCandidate[]): KataGoCandidate =>
  candidates.find((c) => !isPass(c.grid)) ?? candidates[0];

// 候補手を、抽選に出してよい手(grid)だけに絞る。
// 並びはKataGoの元の順番のまま(上位CANDIDATE_COUNT個の中から、条件を満たす手だけ残る)。
// 候補手を、抽選に出してよい手(grid)だけに絞る。
// 並びはKataGoの元の順番のまま。
// 終局が確定している(isFinal)時だけ、KataGoの1位がパスなら、パスだけを返す。
// 未終局の間は、パスは常に落とす。
export const slimCandidates = (
  candidates: KataGoCandidate[],
  boardSize: BoardSize,
  isFinal: boolean,
): Grid[] => {
  if (candidates.length === 0) return [];

  // 終局していて、KataGoの1位がパスなら、パスだけを返す
  if (isFinal && isPass(candidates[0].grid)) return [PASS_GRID];

  // 候補がぜんぶパスなら(置き石が多くて有利すぎる側のKataGoなど)、
  // 「本当にパスしかない」ということなので、パスを許す
  if (candidates.every((move) => isPass(move.grid))) return [PASS_GRID];

  const bestMove = findBestMove(candidates);

  return candidates
    .filter(
      (move) =>
        isValidCandidate(move.grid, bestMove.grid, boardSize) && // パス・端っこ禁止
        Math.abs(move.winRate - bestMove.winRate) <= WINRATE_CUTOFF, // 勝率を下げすぎる手を除外
    )
    .map((move) => move.grid);
};

// [{x:1,y:1,winrate:0.993..}, {x:1,y:2,winrate:0.984..}, ..]
// ▶︎
// [{grid: 0, winrate: 99},{grid: 1, winrate: 98},]
export const rawMovesToCandidates = (
  moves: { x: number; y: number; winRate?: number }[],
  boardSize: BoardSize,
): KataGoCandidate[] => {
  return moves.map((move) => {
    // パス（x=-1, y=-1）以外なら座標を grid (0-indexed) に変換する
    const grid =
      move.x !== -1 && move.y !== -1
        ? (move.y - 1) * boardSize + (move.x - 1) // 通常のGridに変換
        : -1; // PASS_GRIDに変換

    const winRate = toPercent(move.winRate ?? 0.5);

    return { grid, winRate };
  });
};
