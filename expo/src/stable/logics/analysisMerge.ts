// active/logics/analysisMerge.ts
//
// ─── このロジックの責務 ───────────────────────────────
// 棋譜本編の分析結果(record.analysis)と、盤面編集で分岐した先の分析結果
// (editableAnalysis)を1本のRecordAnalysisに合成する。純粋関数。
// branchIndex以前は本編を、それより後は編集後データを参照する。
// ──────────────────────────────────────────────────

import { MoveAnalysisEntry, RecordAnalysis } from "@/packages/go-core/src";



export const EMPTY_ENTRY: MoveAnalysisEntry = {
  winRate: 50,
  scoreLead: 0,
  ownership: [],
  candidates: [],
};

export function mergeAnalysis(
  recordAnalysis: RecordAnalysis | null | undefined, // ← ここを修正
  editableAnalysis: (MoveAnalysisEntry | null)[],
  branchIndex: number | null,
  totalMoves: number,
): RecordAnalysis {
  const perMove: (MoveAnalysisEntry | null)[] = [];

  for (let moveIndex = 0; moveIndex <= totalMoves; moveIndex++) {
    const isAtOrBeforeBranch = branchIndex === null || moveIndex <= branchIndex;
    const entry = isAtOrBeforeBranch
      ? (recordAnalysis?.perMove[moveIndex] ?? null)
      : (editableAnalysis[moveIndex] ?? null);
    perMove.push(entry ?? EMPTY_ENTRY);
  }

  return { perMove };
}
