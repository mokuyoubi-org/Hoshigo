// analysisMerge.ts
//
// ─── このロジックの責務 ───────────────────────────────
// 棋譜本編の分析結果(record.analysis)と、盤面編集で分岐した先の分析結果
// (editableAnalysis)を1本のRecordAnalysisに合成する。純粋関数。
// branchIndex以前は本編を、それより後は編集後データを参照する。
// ──────────────────────────────────────────────────

import { MoveAnalysisEntry, RecordAnalysis } from "go-core";

export const EMPTY_ENTRY: MoveAnalysisEntry = {
  winRate: 50,
  scoreLead: 0,
  ownership: "", // 🔥 "........" とかじゃなくていいのかな
  candidates: [],
};

export const mergeAnalysis = (
  recordAnalysis: RecordAnalysis | null | undefined,
  editableAnalysis: (MoveAnalysisEntry | null)[],
  branchIndex: number | null,
  totalMoves: number,
): RecordAnalysis => {
  const pos: (MoveAnalysisEntry | null)[] = [];
  // データがない手は、ひとつ前の手の値を引き継ぐ(先頭だけ EMPTY_ENTRY)
  let prevEntry: MoveAnalysisEntry = EMPTY_ENTRY;

  for (let moveIndex = 0; moveIndex <= totalMoves; moveIndex++) {
    const isAtOrBeforeBranch = branchIndex === null || moveIndex <= branchIndex;
    const entry = isAtOrBeforeBranch
      ? (recordAnalysis?.pos[moveIndex] ?? null)
      : (editableAnalysis[moveIndex] ?? null);
    const resolved = entry ?? prevEntry;
    pos.push(resolved);
    prevEntry = resolved;
  }

  return { pos };
};