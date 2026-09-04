// useEndgameAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 終局時にKataGoへ「死に石はどれ？」を聞くだけの専用hook。useBotMoveと
// 対になる存在で、こちらは精度優先でb18を使いたいが、b18がまだ準備
// できていない場合はb10、それも無ければb6にフォールバックする。
// ──────────────────────────────────────────────────

import { printCustomKataGoResult } from "@/src/stable/logics/debugLogics";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  MatchType,
  ownershipToDeadStones,
  WHITE,
} from "expo-goband";
import { useKataGo } from "expo-katago";

// 精度が高い順。実際に使われるのはこの中で今すぐ使えるものだけ。
const MODEL_PREFERENCE_ORDER = ["b18", "b10", "b6"] as const;

export function useEndgameAnalysis() {
  const kataGo = useKataGo();

  const analyzeTerritory = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
    boardSize: BoardSize,
  ): Promise<Grid[]> => {
    // 🔥
    const getNextPlayer = (matchType: number, movesCount: number): Color => {
      const isBlackStart = matchType === 0 || matchType === 1;
      const isEven = movesCount % 2 === 0;

      if (isBlackStart) {
        return isEven ? BLACK : WHITE;
      } else {
        return isEven ? WHITE : BLACK;
      }
    };

    const modelId = kataGo.getBestAvailableModel([...MODEL_PREFERENCE_ORDER]);
    console.log("準備できたモデル: ", modelId)

    const result = await kataGo.run({
      board,
      movesSoFar,
      matchType,
      boardSize,
      modelId, // 精度優先でb18、無ければ段階的にフォールバック
      currentPlayer: getNextPlayer(matchType, movesSoFar.length), // 🔥
    });

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    printCustomKataGoResult(
      board,
      movesSoFar,
      getNextPlayer(matchType, movesSoFar.length),
      result,
    );

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    return result ? ownershipToDeadStones(board, result.ownership) : [];
  };

  return { analyzeTerritory };
}