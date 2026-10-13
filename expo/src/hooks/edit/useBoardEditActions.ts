// useBoardEditActions.ts

import { getOwnershipTerritoryBoard } from "@/src/logics/game/ownershipTerritory";
import {
  BoardSize,
  PASS_GRID,
  endsWithDoublePass,
  makeGrid,
  scoreLeadToResult,
} from "go-core";
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
  const [shownTerritoryKey, setShownTerritoryKey] = useState<{
    index: number;
    isEditMode: typeof board.isEditMode;
  } | null>(null);

  // 🐱 今どちらの処理が動いているかを保持する
  const [activeProcessing, setActiveProcessing] =
    useState<ProcessingType>(null);

  // 🐱 バッジをタップして「盤面に地を表示中」かどうか。
  //    覚えている局面・モードと今が違えば、自動的に false(= 局面やモードが変わったら消える)
  const isTerritoryShown =
    shownTerritoryKey !== null &&
    shownTerritoryKey.index === board.currentIndex &&
    shownTerritoryKey.isEditMode === board.isEditMode;

  // 🐱 地計算の結果（編集モードでも棋譜モードでも出す）。
  //    分析キャッシュの ownership / scoreLead を読むだけ。KataGoは回さない。
  //    確定した局面(連続パスで終わり、終局とも判定された)の ownership / scoreLead は、
  //    保存時にgoscorerの結果で上書き済みなので、ここで「どっちか」を気にする必要はない。
  //    分析がまだ/無いなら null（= 何も表示しない）。
  //    isFinal: 手の並びが連続パスで終わっているか(バッジの確定/暫定の色分け用)
  const territory = useMemo(() => {
    const entry = board.combinedAnalysis.perMove[board.currentIndex];
    const territoryBoard = getOwnershipTerritoryBoard(
      boardSize,
      board.processed.boardHistory[board.currentIndex],
      board.combinedAnalysis,
      board.currentIndex,
    );
    if (!entry || !territoryBoard) return null;

    return {
      territoryBoard,
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
      const cached = board.combinedAnalysis.perMove[board.currentIndex];
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
      board.handleEditStone(
        best.x === -1 || best.y === -1
          ? PASS_GRID
          : makeGrid(best.y, best.x, boardSize),
        "bot",
      );
    } finally {
      setActiveProcessing(null); // 終わったらリセット！
    }
  };

  return {
    // 🐱 バッジ用（文字 + 確定かどうか）
    territoryResult: territory,
    // 🐱 盤面に出す地。バッジをタップしている間だけ入る（前の manualTerritory と同じ使い方）
    manualTerritory: isTerritoryShown ? territory : null,
    handleShowTerritory: () =>
      setShownTerritoryKey({
        index: board.currentIndex,
        isEditMode: board.isEditMode,
      }),
    handleBotSuggest,
    isBotSuggesting: activeProcessing === "bot",
    isAnyProcessing: activeProcessing !== null || board.isAnalyzing,
  };
};
