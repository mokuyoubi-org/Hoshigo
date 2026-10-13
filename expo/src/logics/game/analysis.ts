// analysis.ts

import { AnalyzeResult } from "expo-katago";
import {
  BoardSize,
  Grid,
  MatchType,
  MoveAnalysisEntry,
  RecordAnalysis,
  settleAnalysis,
} from "go-core";

const round2 = (n: number) => Math.round(n * 100) / 100;
const toPercent = (n: number) => Math.round(n * 100);

// 分析した局面の情報。確定した終局局面(連続パスで終わり、終局とも判定された)
// かどうかを、settleAnalysisが手の並びから判断するために必要。
type AnalysisContext = {
  boardSize: BoardSize;
  matchType: MatchType;
  movesSoFar: Grid[]; // この分析をした局面までの手の並び
};

// winRate/scoreLeadはKataGoが常に黒視点で返してくる(currentPlayerに依存しない)ので、
// ここでの反転処理は不要。そのまま黒視点の値として保存する。
export const buildMoveAnalysisEntry = (
  result: AnalyzeResult,
  context: AnalysisContext,
): MoveAnalysisEntry => {
  // 🌟保存する前に必ず「仕上げ」を通す。確定した局面だけ、ownershipとscoreLeadが
  // goscorerの結果で上書きされる。それ以外は、KataGoの値のまま。
  const settled = settleAnalysis(
    context.boardSize,
    context.matchType,
    context.movesSoFar,
    result.ownership,
    result.scoreLead,
  );

  return {
    winRate: toPercent(result.winRate),
    scoreLead: round2(settled.scoreLead),
    ownership: Array.from(settled.ownership, round2),
    candidates: result.moves.slice(0, 10).map((m) => ({
      // ⚠️⚠️⚠️⚠️⚠️ここでtopKをトリミングしていた！
      x: m.x,
      y: m.y,
      winRate: toPercent(m.winRate),
      scoreLead: m.scoreLead, // 🔥🔥🔥🔥🔥ここで0.5刻みにしなくていいのか？
    })),
  };
};

export const getAnalyzedCount = (
  analysis: RecordAnalysis | null,
  totalMoves: number,
): number => {
  if (!analysis) return 0;
  let count = 0;
  while (count < totalMoves && analysis.perMove[count] != null) {
    count++;
  }
  return count;
};

export const createEmptyAnalysis = (totalMoves: number) => {
  return { perMove: Array(totalMoves).fill(null) };
};

// currentIndexは「打たれた手数」(AnalyzeScreenのcurrentIndexと同じ意味)。
// i手目(0-indexed)の解析結果はcurrentIndex=i+1に対応する。
export const getEntryForIndex = (
  analysis: RecordAnalysis,
  currentIndex: number,
): MoveAnalysisEntry | null => {
  const moveIndex = currentIndex - 1;
  if (moveIndex < 0) return null;
  return analysis.perMove[moveIndex] ?? null;
};


// サーバーへ送る形(整数だけ・黒視点)に直す。
// ownership は ×100(-100〜100)、score_lead は ×10、win_rate は ×1000。
// 仕上げ済みのエントリ(終局局面はgoscorerの値)から作る。
// win_rate だけは、エントリだと整数%に丸められて粗いので、KataGoの生の値から作る。
const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(n)));

export const toServerAnalysis = (
  entry: MoveAnalysisEntry,
  rawWinRate: number,
) => ({
  ownership: entry.ownership.map((v) => clampInt(v * 100, -100, 100)),
  score_lead: Math.round(entry.scoreLead * 10),
  win_rate: clampInt(rawWinRate * 1000, 0, 1000),
});