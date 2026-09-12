// useBotCalculation.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 終局時にKataGoへ「死に石はどれ？」を聞くだけの専用hook。精度優先で
// b18を希望するが、まだ準備できていなければuseKataGoTask側が自動で
// b10・b6にフォールバックする。
//
// 2026/09/07: 死に石判定のためのkataGo呼び出しは、最終局面の
// winRate/scoreLeadも一緒に持っている。今まではownershipだけ抜き出して
// 捨てていたが、これは「最後の1手を打った後の局面」の解析結果そのもの
// なので、呼び出し元(useMatchSession)がliveAnalysisに記録できるよう
// analysisごと返す。
// ──────────────────────────────────────────────────

import { AnalyzeResult } from "expo-katago";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  MatchType,
  WHITE,
  ownershipToDeadStones,
} from "go-core";
import { useKataGoTask } from "./useKataGoTask";

export function useBotCalculation() {
  const kataGoTask = useKataGoTask();

  const analyzeTerritory = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
    boardSize: BoardSize,
  ): Promise<{ deadStones: Grid[]; analysis: AnalyzeResult | null }> => {
    const getNextPlayer = (matchType: number, movesCount: number): Color => {
      const isBlackStart = matchType === 0 || matchType === 1;
      const isEven = movesCount % 2 === 0;

      if (isBlackStart) {
        return isEven ? BLACK : WHITE;
      } else {
        return isEven ? WHITE : BLACK;
      }
    };

    const analysis = await kataGoTask.run({
      board,
      movesSoFar,
      matchType,
      boardSize,
      modelId: "b10", // 精度優先の希望。無ければ自動でb6にフォールバック
      currentPlayer: getNextPlayer(matchType, movesSoFar.length),
    });

    const deadStones = analysis
      ? ownershipToDeadStones(board, analysis.ownership)
      : [];

    return { deadStones, analysis };
  };

  return { analyzeTerritory };
}
