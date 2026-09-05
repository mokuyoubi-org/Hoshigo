// useSuggestNextMove.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 盤面編集モード専用。「今のboard/movesSoFarに対して、ボットなら次に
// どこへ打つか」を単発で1回だけ聞く。useBotMoveと違い、通信対局の
// ターンパリティ検証・opponentUsernameベースのモデル選択・二重パス
// 強制処理は一切持たない(編集モードではそもそも成立しない概念のため)。
// ──────────────────────────────────────────────────

import { useRef, useState } from "react";
import {
  Board,
  BoardSize,
  getColorToMove,
  Grid,
  makeGrid,
  MatchType,
  PASS_GRID,
} from "expo-goband";
import { useKataGo } from "expo-katago";

const MODEL_PREFERENCE_ORDER = ["b18", "b10", "b6"] as const;

export function useSuggestNextMove(
  boardSize: BoardSize,
  matchType: MatchType,
) {
  const kataGo = useKataGo();
  const isThinkingRef = useRef(false);
  const [isThinking, setIsThinking] = useState(false);

  const suggestNextMove = async (
    board: Board,
    movesSoFar: Grid[],
  ): Promise<Grid | null> => {
    if (isThinkingRef.current) return null;
    isThinkingRef.current = true;
    setIsThinking(true);
    try {
      const modelId = kataGo.getBestAvailableModel([
        ...MODEL_PREFERENCE_ORDER,
      ]);
      const currentPlayer = getColorToMove(matchType, movesSoFar.length);

      const result = await kataGo.run({
        board,
        movesSoFar,
        matchType,
        boardSize,
        modelId,
        currentPlayer,
      });

      if (!result || !result.moves || result.moves.length === 0) return null;

      const best = result.moves[0];
      return best.x === -1 || best.y === -1
        ? PASS_GRID
        : makeGrid(best.y, best.x, boardSize);
    } finally {
      isThinkingRef.current = false;
      setIsThinking(false);
    }
  };

  return { suggestNextMove, isThinking };
}