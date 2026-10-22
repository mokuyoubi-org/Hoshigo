// expo/src/logics/game/analysis.ts

import { KataGoTaskResult } from "@/src/hooks/ai/useKataGoTask";
import { MoveAnalysisEntry, RecordAnalysis } from "go-core";

// winRate/scoreLeadはKataGoが常に黒視点で返してくる(currentPlayerに依存しない)ので、
// ここでの反転処理は不要。そのまま黒視点の値として保存する。
// 「仕上げ」(終局ならgoscorerで上書き)は、useKataGoTaskの中でもう済んでいる。
export const buildMoveAnalysisEntry = (
  result: KataGoTaskResult,
): MoveAnalysisEntry => ({
  winRate: result.winRate,
  scoreLead: result.scoreLead,
  ownership: result.ownership,
  candidates: result.candidates,
});

export const getAnalyzedCount = (
  analysis: RecordAnalysis | null,
  totalMoves: number,
): number => {
  if (!analysis) return 0;
  let count = 0;
  while (count < totalMoves && analysis.pos[count] != null) {
    count++;
  }
  return count;
};

// 全部の局面(0 〜 totalMoves)の分析が、そろっているか
export const isAnalysisComplete = (
  analysis: RecordAnalysis | null,
  totalMoves: number,
): boolean => {
  if (!analysis) return false;
  for (let i = 0; i <= totalMoves; i++) {
    if (analysis.pos[i] == null) return false;
  }
  return true;
};




export const createEmptyAnalysis = (totalMoves: number) => {
  return { pos: Array(totalMoves).fill(null) };
};

// 1局ぶんの分析を、サーバーへ出す形(項目ごとの配列。位置 = 局面の番号、無い局面は null)にする。
// positions = 局面の数(手数 + 1)。足りない分は null で埋める。
export const toServerAnalysis = (
  analysis: RecordAnalysis,
  positions: number,
) => {
  const pos = Array.from(
    { length: positions },
    (_, i) => analysis.pos[i] ?? null,
  );
  return {
    ownership: pos.map((entry) => entry?.ownership ?? null),
    win_rate: pos.map((entry) => entry?.winRate ?? null),
    candidates: pos.map((entry) => entry?.candidates ?? null),
  };
};