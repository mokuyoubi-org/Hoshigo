// useBoardEditActions.ts

import {
  BoardSize,
  MatchType,
  PASS_GRID,
  generateTerritoryBoard,
  isBoardUnfinished,
  makeGrid,
  ownershipToDeadStones,
  ownershipToTerritoryBoard,
  scoreLeadToResult,
} from "go-core";
import { useEffect, useMemo, useState } from "react";
import { useEditableGoBoard } from "./useEditableGoBoard";

type EditableGoBoard = ReturnType<typeof useEditableGoBoard>;

// 🐱 今実行中の処理を管理する型
type ProcessingType = "bot" | null;

export function useBoardEditActions(
  board: EditableGoBoard,
  boardSize: BoardSize,
  matchType: MatchType,
) {
  // 🐱 バッジをタップして「盤面に地を表示中」かどうか
  const [isTerritoryShown, setIsTerritoryShown] = useState(false);

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
    setIsTerritoryShown(false); // 局面やモードが変わったら、盤面の地表示は消す
  }, [board.currentIndex, board.isEditMode]);

  // 🐱 地計算の結果（編集モードでも棋譜モードでも出す）。
  //    キャッシュにownership込みの分析があるときだけ、その場で計算する。
  //    KataGoは回さない。分析がまだ/無いなら null（= 何も表示しない）。
  //    isFinal: true = 終局した局面の確定結果 / false = scoreLead由来の暫定表示
  const territory = useMemo(() => {
    const entry = board.combinedAnalysis.perMove[board.currentIndex];
    if (!entry || entry.ownership.length === 0) return null;

    const currentBoard = board.processed.boardHistory[board.currentIndex];
    if (!currentBoard) return null;

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
      return {
        territoryBoard: ownershipToTerritoryBoard(
          boardSize,
          currentBoard,
          entry.ownership,
        ),
        text: scoreLeadToResult(entry.scoreLead),
        isFinal: false,
      };
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
    return { territoryBoard, text: result, isFinal: true };
  }, [
    board.combinedAnalysis,
    board.currentIndex,
    board.processed.boardHistory,
    board.currentAgehama.black,
    board.currentAgehama.white,
    boardSize,
    matchType,
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
    handleShowTerritory: () => setIsTerritoryShown(true),
    handleBotSuggest,
    isBotSuggesting: activeProcessing === "bot",
    isAnyProcessing: activeProcessing !== null || board.isAnalyzing,
  };
}