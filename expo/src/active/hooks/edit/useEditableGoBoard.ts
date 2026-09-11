// active/hooks/screens/useEditableGoBoard.ts
//
// ─── このhookの責務 ───────────────────────────────────
// useEditableMoves(着手・盤面)とuseAnalysisCache(分析キャッシュ)を束ねる。
// 両者のリセットタイミングを合わせることと、着手直後に分析をキックする
// ことだけを担当する。
// ──────────────────────────────────────────────────

import { RecordType } from "@/src/active/types/record";
import { useAnalysisCache } from "./useAnalysisCache";
import { useEditableMoves } from "./useEditableMoves";

import { Grid } from "go-core";
import { useState } from "react"; // ← 追加

export function useEditableGoBoard(record: RecordType) {
  const moves = useEditableMoves(record);
  const analysis = useAnalysisCache(
    record.analysis,
    record.match_type,
    moves.boardSize,
    moves.processed.moves.length,
    moves.branchIndex,
  );

  // 🐱 編集モードで着手した時、裏でKataGoを自動的に走らせるかどうか
  const [isAutoAnalysisEnabled, setIsAutoAnalysisEnabled] = useState(true);
  const toggleAutoAnalysis = () => setIsAutoAnalysisEnabled((prev) => !prev);

  const toggleEditMode = () => {
    if (!moves.isEditMode) {
      moves.enterEditMode();
    } else {
      moves.exitEditMode();
      analysis.reset();
    }
  };

  const handlePutStone = (grid: Grid, source: "human" | "bot" = "human") => {
    if (!moves.isEditMode || analysis.isAnalyzing) return;
    const inserted = moves.tryPutStone(grid, source);
    if (!inserted) return; // 非合法手

    const { newIndex, newBoard, newMoves } = inserted;
    analysis.truncateFrom(newIndex + 1);

    if (isAutoAnalysisEnabled) {
      analysis.runAndStoreAnalysis(newIndex + 1, newBoard, newMoves);
    } else {
      analysis.storeDefaultEntry(newIndex + 1); // ← offなら既定値だけ入れる
    }
  };

  return {
    boardSize: moves.boardSize,
    isEditMode: moves.isEditMode,
    toggleEditMode,
    currentIndex: moves.currentIndex,
    setCurrentIndex: moves.setCurrentIndex,
    maxIdx: moves.maxIdx,
    processed: moves.processed,
    editMarkers: moves.editMarkers,
    handlePutStone,
    isBlackPass: moves.isBlackPass,
    isWhitePass: moves.isWhitePass,
    currentAgehama: moves.currentAgehama,
    runAndStoreAnalysis: analysis.runAndStoreAnalysis,
    combinedAnalysis: analysis.combinedAnalysis,
    isAnalyzing: analysis.isAnalyzing,
    isAutoAnalysisEnabled,
    toggleAutoAnalysis,
  };
}
