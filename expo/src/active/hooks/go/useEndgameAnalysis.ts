// useEndgameAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 終局時にKataGoへ「死に石はどれ？」を聞くだけの専用hook。useBotMoveと
// 対になる存在で、こちらは常にb18(最も精度の高いモデル)を固定で使う。
// ──────────────────────────────────────────────────

import { printCleanLog } from "@/src/stable/logics/debugLogics";
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

    const result = await kataGo.run({
      board,
      movesSoFar,
      matchType,
      boardSize,
      modelId: "b18", // 終局は精度優先で固定
      currentPlayer: getNextPlayer(matchType, movesSoFar.length), // 🔥
    });

    printCleanLog("[useEndgameAnalysis]katagoの返答: ", result);

    return result ? ownershipToDeadStones(board, result.ownership) : [];
  };

  return { analyzeTerritory };
}
