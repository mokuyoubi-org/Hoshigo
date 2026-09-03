// analysis.ts

import { AnalyzeResult } from "@/packages/expo-katago/src";
import { MoveAnalysisEntry, RecordAnalysis } from "@/src/active/types/analysis";

const round2 = (n: number) => Math.round(n * 100) / 100;
const toPercent = (n: number) => Math.round(n * 100);

// winRate/scoreLeadはKataGoが常に黒視点で返してくる(currentPlayerに依存しない)ので、
// ここでの反転処理は不要。そのまま黒視点の値として保存する。
export function buildMoveAnalysisEntry(result: AnalyzeResult): MoveAnalysisEntry {
  return {
    winRate: toPercent(result.winRate),
    scoreLead: round2(result.scoreLead),
    ownership: Array.from(result.ownership, round2),
    candidates: result.moves.slice(0, 5).map((m) => ({
      x: m.x,
      y: m.y,
      winRate: toPercent(m.winRate),
    })),
  };
}

export function getAnalyzedCount(
  analysis: RecordAnalysis | null,
  totalMoves: number,
): number {
  if (!analysis) return 0;
  let count = 0;
  while (count < totalMoves && analysis.perMove[count] != null) {
    count++;
  }
  return count;
}

export function createEmptyAnalysis(totalMoves: number): RecordAnalysis {
  return { perMove: Array(totalMoves).fill(null) };
}

// currentIndexは「打たれた手数」(AnalyzeScreenのcurrentIndexと同じ意味)。
// i手目(0-indexed)の解析結果はcurrentIndex=i+1に対応する。
export function getEntryForIndex(
  analysis: RecordAnalysis,
  currentIndex: number,
): MoveAnalysisEntry | null {
  const moveIndex = currentIndex - 1;
  if (moveIndex < 0) return null;
  return analysis.perMove[moveIndex] ?? null;
}