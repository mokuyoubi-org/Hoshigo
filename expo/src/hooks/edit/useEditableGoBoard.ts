// useEditableGoBoard.ts
//
// ─── このhookの責務 ───────────────────────────────────
// useEditableMoves(着手・盤面)とuseEditAnalysisCache(分析キャッシュ)を束ねる。
// 両者のリセットタイミングを合わせることと、着手直後に分析をキックする
// ことだけを担当する。
//
// 推論は目(isEyeOpen)のon/offに関わらず常に行う。isEyeOpenは「表示するか
// どうか」だけの役目に変更した(以前はisEyeOpen offの間は推論自体をスキップ
// していたが、それだと目をoffにしないと連打できない、という制約になって
// いたため)。連打で不要になった解析(巻き戻して別の手を打った時の「先」)は
// analysis.cancelPendingAnalysisで後始末する。
// ──────────────────────────────────────────────────

import { RecordType } from "@/src/types/record";
import { ShowMode } from "go-components";
import { Grid } from "go-core";
import { useKVStorage } from "kv-store";
import { useEditAnalysisCache } from "./useEditAnalysisCache";
import { useEditableMoves } from "./useEditableMoves";

export const useEditableGoBoard = (record: RecordType) => {
  const moves = useEditableMoves(record);
  const analysis = useEditAnalysisCache(
    record.analysis,
    record.match_type,
    moves.boardSize,
    moves.processed.moves.length,
    moves.branchIndex,
  );

  // ローカル設定
  // 🌟 ダブルタップは、今の盤サイズ用の設定だけを読む(5路でも効く)
  const { value: doubleTap } = useKVStorage<boolean>(
    `global.doubleTap${moves.boardSize}`,
    false,
  );
  const { value: isSoundEnabled } = useKVStorage<boolean>("global.sound", true);

  const { value: showOwnership } = useKVStorage<boolean>(
    "BoardEditScreen.showOwnership",
    true,
  );

  const { value: showWinRateBar } = useKVStorage<boolean>(
    "BoardEditScreen.showWinRateBar",
    true,
  );

  const { value: showMode } = useKVStorage<ShowMode>(
    "BoardEditScreen.showMode",
    "both",
  );

  const { value: showMoveEvaluation } = useKVStorage<boolean>(
    "BoardEditScreen.showMoveEvaluation",
    true,
  );

  const toggleEditMode = () => {
    if (!moves.isEditMode) {
      moves.enterEditMode();
    } else {
      moves.exitEditMode();
      analysis.reset(); // 🐱 内部でcancelPendingAnalysisも呼ばれる
    }
  };

  const handleEditStone = (grid: Grid, source: "human" | "bot" = "human") => {
    // 🛡️ガード: 編集モード外では何もしない。解析中でも着手はブロックしない
    // (常に推論を続けながら連打できるようにするため。以前はanalysis.isAnalyzing
    //  も見て打てなくしていたが撤廃した)。
    if (!moves.isEditMode) return;

    // 🐱 巻き戻した状態から新しい手を打つ(＝これまでの「先」が上書きされる)
    //    時は、その先に対して積まれていた解析依頼はもう無関係になるので
    //    ここでキャンセルする。
    const isBranching = moves.currentIndex < moves.editableMoves.length;
    if (isBranching) {
      analysis.cancelPendingAnalysis();
    }

    const inserted = moves.tryPutStone(grid, source);
    if (!inserted) return; // 非合法手

    const { newIndex, newBoard, newMoves } = inserted;
    analysis.truncateFrom(newIndex + 1);

    // 🐱 目のon/offに関わらず、推論自体は常に行う(呼び出し元はawaitしない
    //    ので、連打しても待たされない)。
    analysis.runAndStoreAnalysis(newIndex + 1, newBoard, newMoves);
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
    handleEditStone,
    isBlackPass: moves.isBlackPass,
    isWhitePass: moves.isWhitePass,
    currentAgehama: moves.currentAgehama,
    runAndStoreAnalysis: analysis.runAndStoreAnalysis,
    combinedAnalysis: analysis.combinedAnalysis,
    isAnalyzing: analysis.isAnalyzing,
    doubleTap,
    isSoundEnabled,
    showOwnership,
    showWinRateBar,
    showMode,
    showMoveEvaluation,
  };
};
