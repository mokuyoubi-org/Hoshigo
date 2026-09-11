// active/hooks/screens/useBoardEditActions.ts

import {
  BoardSize,
  MatchType,
  PASS_GRID,
  TerritoryBoard,
  generateTerritoryBoard,
  makeGrid,
  ownershipToDeadStones,
} from "@/packages/go-core/src";
import { useEffect, useState } from "react";
import { useEditableGoBoard } from "./useEditableGoBoard";

type EditableGoBoard = ReturnType<typeof useEditableGoBoard>;

// 🐱 今実行中の処理を管理する型
type ProcessingType = "bot" | "territory" | null;

export function useBoardEditActions(
  board: EditableGoBoard,
  boardSize: BoardSize,
  matchType: MatchType,
) {
  const [manualTerritory, setManualTerritory] = useState<{
    territoryBoard: TerritoryBoard;
    result: string;
  } | null>(null);

  // 🐱 今どちらの処理が動いているかを保持する
  const [activeProcessing, setActiveProcessing] =
    useState<ProcessingType>(null);

  useEffect(() => {
    // ⚠️⚠️⚠️謎のエラーを防ぐための部分なので消さない。これがないとBlocked aria-hidden...とか言われる
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    setManualTerritory(null);
  }, [board.currentIndex, board.isEditMode]);

  const handleBotSuggest = async () => {
    if (board.isAnalyzing || activeProcessing !== null) return;

    setActiveProcessing("bot"); // 🤖 ボット計算開始
    try {
      const entry = await board.runAndStoreAnalysis(
        board.currentIndex,
        board.processed.boardHistory[board.currentIndex],
        board.processed.moves.slice(0, board.currentIndex),
      );
      const best = entry?.candidates[0];
      if (!best) return;
      board.handlePutStone(
        best.x === -1 || best.y === -1
          ? PASS_GRID
          : makeGrid(best.y, best.x, boardSize),
        "bot",
      );
    } finally {
      setActiveProcessing(null); // 終わったらリセット！
    }
  };

  const handleCalculateTerritory = async () => {
    if (board.isAnalyzing || activeProcessing !== null) return;

    setActiveProcessing("territory"); // 🧮 地計算開始
    try {
      const currentBoard = board.processed.boardHistory[board.currentIndex];
      const entry = await board.runAndStoreAnalysis(
        board.currentIndex,
        currentBoard,
        board.processed.moves.slice(0, board.currentIndex),
      );
      if (!entry) return;

      const deadStones = ownershipToDeadStones(currentBoard, entry.ownership);
      const { territoryBoard, result } = generateTerritoryBoard(
        boardSize,
        currentBoard,
        deadStones,
        matchType,
        board.currentAgehama.black,
        board.currentAgehama.white,
      );
      setManualTerritory({ territoryBoard, result });
    } finally {
      setActiveProcessing(null); // 終わったらリセット！
    }
  };

  return {
    manualTerritory,
    handleBotSuggest,
    handleCalculateTerritory,
    // 🐱 それぞれのボタン専用の状態を画面側に渡してあげる
    isBotSuggesting: activeProcessing === "bot",
    isCalculatingTerritory: activeProcessing === "territory",
    isAnyProcessing: activeProcessing !== null || board.isAnalyzing,
  };
}
