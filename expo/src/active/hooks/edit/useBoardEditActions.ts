// useBoardEditActions.ts

import { printDebugBoard } from "@/src/stable/logics/debugLogics";
import {
  BoardSize,
  MatchType,
  PASS_GRID,
  TerritoryBoard,
  generateTerritoryBoard,
  isBoardUnfinished,
  makeGrid,
  ownershipToDeadStones,
  ownershipToTerritoryBoard,
  scoreLeadToResult,
} from "go-core";
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

  // 地計算ボタンを押した時の処理
  const handleCalculateTerritory = async () => {
    // 🛡️ガード
    if (board.isAnalyzing || activeProcessing !== null) return;

    setActiveProcessing("territory"); // 🧮 地計算開始
    try {
      const currentBoard = board.processed.boardHistory[board.currentIndex];
      printDebugBoard(currentBoard);
      // 🐱 ownership込みの分析が既にキャッシュにあるなら、KataGoを叩き直さず使い回す
      const cached = board.combinedAnalysis.perMove[board.currentIndex];
      const entry =
        cached && cached.ownership.length > 0
          ? cached
          : await board.runAndStoreAnalysis(
              board.currentIndex,
              currentBoard,
              board.processed.moves.slice(0, board.currentIndex),
            );
      if (!entry) return;
      console.log("ownership: ", entry.ownership);

      // 🐱 goscorer(generateTerritoryBoard)は「終局した正しい盤面」を渡して
      //    初めて正しい答えを返す道具。終局してない盤面に使うと変な地が出て
      //    しまうので、その場合はownership/scoreLead由来の暫定表示に切り替える。
      if (
        isBoardUnfinished(
          currentBoard,
          boardSize,
          entry.ownership,
          board.currentIndex, // 🔥これがmovesSoFar.lengthと同じかは疑問、ただ、MIN_MOVES_FOR_TERRITORY_CHECKとの比較に使うだけなのでアバウトでいいと思う
        )
      ) {
        console.log("終局してないよ");
        const territoryBoard = ownershipToTerritoryBoard(
          boardSize,
          currentBoard,
          entry.ownership,
        );
        const result = scoreLeadToResult(entry.scoreLead);
        setManualTerritory({ territoryBoard, result });
        return;
      }

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
