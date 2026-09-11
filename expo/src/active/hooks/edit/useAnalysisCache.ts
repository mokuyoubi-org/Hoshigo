// active/hooks/screens/useAnalysisCache.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 編集で積んだ分析結果(editableAnalysis)のキャッシュと、本編分析との
// 合成(combinedAnalysis)を担当する。着手の管理には一切関知しない。
// ──────────────────────────────────────────────────


import { buildMoveAnalysisEntry } from "@/src/stable/logics/analysis";
import { EMPTY_ENTRY, mergeAnalysis } from "@/src/stable/logics/analysisMerge";
import { useMemo, useRef, useState } from "react";
import { useKataGoTask } from "../bot/useKataGoTask";
import { RecordAnalysis, MatchType, BoardSize, MoveAnalysisEntry, Board, Grid, getColorToMove } from "@/packages/go-core/src";

export function useAnalysisCache(
  recordAnalysis: RecordAnalysis | null | undefined, // ← ここを修正
  matchType: MatchType,
  boardSize: BoardSize,
  totalMoves: number,
  branchIndex: number | null,
) {
  const kataGoTask = useKataGoTask();
  const [editableAnalysis, setEditableAnalysis] = useState<
    (MoveAnalysisEntry | null)[]
  >([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const requestSeqRef = useRef(0);

  const storeEditableAnalysis = (
    moveIndex: number,
    entry: MoveAnalysisEntry | null,
  ) => {
    setEditableAnalysis((prev) => {
      const next = [...prev];
      while (next.length <= moveIndex) next.push(null);
      next[moveIndex] = entry;
      return next;
    });
  };

  const combinedAnalysis = useMemo(
    () =>
      mergeAnalysis(recordAnalysis, editableAnalysis, branchIndex, totalMoves),
    [recordAnalysis, editableAnalysis, branchIndex, totalMoves],
  );

  // 🐱 moveIndex手目を打つ前の局面をkataGoで分析し、キャッシュに書き込む唯一の入口
  const runAndStoreAnalysis = async (
    moveIndex: number,
    board: Board,
    movesSoFar: Grid[],
  ): Promise<MoveAnalysisEntry | null> => {
    const mySeq = ++requestSeqRef.current;
    setIsAnalyzing(true);
    try {
      const result = await kataGoTask.run({
        board,
        movesSoFar,
        matchType,
        boardSize,
        modelId: "b18",
        currentPlayer: getColorToMove(matchType, moveIndex),
      });

      if (mySeq !== requestSeqRef.current) return null; // 古いリクエストは破棄

      const entry = result ? buildMoveAnalysisEntry(result) : null;
      storeEditableAnalysis(moveIndex, entry);
      return entry;
    } finally {
      if (mySeq === requestSeqRef.current) setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setEditableAnalysis([]);
    requestSeqRef.current++;
    setIsAnalyzing(false);
  };

  const truncateFrom = (fromIndex: number) => {
    setEditableAnalysis((prev) => prev.slice(0, fromIndex));
  };

  // 🐱 自動分析がoffの時に呼ぶ。KataGoを叩かず既定値(winRate:50, scoreLead:0)を書き込むだけ
  const storeDefaultEntry = (moveIndex: number) => {
    storeEditableAnalysis(moveIndex, EMPTY_ENTRY);
  };

  return {
    combinedAnalysis,
    isAnalyzing,
    runAndStoreAnalysis,
    truncateFrom,
    reset,
    storeDefaultEntry, // ← 追加
  };
}
