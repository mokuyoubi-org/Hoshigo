// useBoardEditActions.ts

import { scoreLeadToResult } from "@/src/logics/format/textFormatter";
import { BoardSize, endsWithDoublePass, getDisplayOwnership } from "go-core";
import { useMemo, useState } from "react";
import { useEditableGoBoard } from "./useEditableGoBoard";

type EditableGoBoard = ReturnType<typeof useEditableGoBoard>;

// 🐱 今実行中の処理を管理する型
type ProcessingType = "bot" | null;

export const useBoardEditActions = (
  board: EditableGoBoard,
  boardSize: BoardSize,
) => {
  // 🐱 バッジをタップした時点の「局面 + モード」を覚えておく(未タップなら null)
  const [shownTerritoryKey, setShownTerritoryKey] = useState<number | null>(
    null,
  );

  // 🐱 今どちらの処理が動いているかを保持する
  const [activeProcessing, setActiveProcessing] =
    useState<ProcessingType>(null);

  // 🐱 バッジをタップして「盤面に地を表示中」かどうか。
  //    覚えている局面・モードと今が違えば、自動的に false(= 局面やモードが変わったら消える)
  const isTerritoryShown =
    shownTerritoryKey !== null && shownTerritoryKey === board.currentIndex;

  // 🐱 地計算の結果（編集モードでも棋譜モードでも出す）。
  //    分析キャッシュの ownership / scoreLead を読むだけ。KataGoは回さない。
  //    確定した局面(連続パスで終わり、終局とも判定された)の ownership / scoreLead は、
  //    保存時にgoscorerの結果で上書き済みなので、ここで「どっちか」を気にする必要はない。
  //    分析がまだ/無いなら null（= 何も表示しない）。
  //    isFinal: 手の並びが連続パスで終わっているか(バッジの確定/暫定の色分け用)
  const territory = useMemo(() => {
    const entry = board.combinedAnalysis.pos[board.currentIndex];
    const ownership = getDisplayOwnership(
      boardSize,
      board.processed.boardHistory[board.currentIndex],
      board.combinedAnalysis,
      board.currentIndex,
    );
    if (!entry || !ownership) return null;

    return {
      ownership,
      text: scoreLeadToResult(entry.scoreLead),
      isFinal: endsWithDoublePass(
        board.processed.moves.slice(0, board.currentIndex),
      ),
    };
  }, [
    board.combinedAnalysis,
    board.currentIndex,
    board.processed.boardHistory,
    board.processed.moves,
    boardSize,
  ]);
  const handleBotSuggest = async () => {
    // 🛡️ガード
    if (board.isAnalyzing || activeProcessing !== null) return;

    setActiveProcessing("bot"); // 🤖 ボット計算開始
    try {
      // 🐱 この局面の分析が既にキャッシュにあるなら、KataGoを叩き直さず使い回す
      const cached = board.combinedAnalysis.pos[board.currentIndex];
      const entry =
        cached && cached.candidates.length > 0
          ? cached
          : await board.runAndStoreAnalysis(
              board.currentIndex,
              board.processed.boardHistory[board.currentIndex],
              board.processed.moves.slice(0, board.currentIndex),
            );
      const best = entry?.candidates[0];
      if (!best) return;
      board.handleEditStone(best, "bot");
    } finally {
      setActiveProcessing(null); // 終わったらリセット！
    }
  };

  return {
    // 🐱 バッジ用（文字 + 確定かどうか）
    territoryResult: territory,
    // 🐱 盤面に出す地。バッジをタップしている間だけ入る（前の manualTerritory と同じ使い方）
    manualTerritory: isTerritoryShown ? territory : null, // 必要くさい。すぐ下のhandleShowTerritoryと関連してるくさい
    handleShowTerritory: () =>
      setShownTerritoryKey(
        isTerritoryShown
          ? null // 🐱 すでに表示中なら、押したら消す
          : board.currentIndex,
      ),
    handleBotSuggest,
    isBotSuggesting: activeProcessing === "bot",
    isAnyProcessing: activeProcessing !== null || board.isAnalyzing,
    setShownTerritoryKey
  };
};
