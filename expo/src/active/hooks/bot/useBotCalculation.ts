// useBotCalculation.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 終局時にKataGoへ「死に石はどれ？」を聞くだけの専用hook。地計算の
// ミスは致命的(勝敗が確定してしまう)なので、b10を要求し、
// フォールバックは一切許さない(useKataGoTaskのrunExactを使う)。
// b10がまだDL/ウォームアップ未完了でも、その完了を待ってから解析する
// (待ち時間はあってもb6の結果を使うことは絶対にない)。
//
// 2026/09/07: 死に石判定のためのkataGo呼び出しは、最終局面の
// winRate/scoreLeadも一緒に持っている。今まではownershipだけ抜き出して
// 捨てていたが、これは「最後の1手を打った後の局面」の解析結果そのもの
// なので、呼び出し元(useMatchSession)がliveAnalysisに記録できるよう
// analysisごと返す。
// 2026/09/18: 更新
// 2026/09/19: b6フォールバック混入のリスクを断つため、useKataGoTask.run
// (フォールバックあり)からrunExact(フォールバック無し)に切り替え。
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
  isBoardUnfinished,
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
    // 🌟呼び出し元がすでに「この局面」の解析結果を持っている場合はそれを渡してもらう。
    //   渡された場合はKataGoを再度呼ばず、そのまま死に石計算に使い回す。
    //   未指定(undefined)の場合、または解析に失敗していた場合(null)は、
    //   今まで通りこの場で新規に解析する。
    precomputedAnalysis?: AnalyzeResult | null,
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

    const analysis = precomputedAnalysis
      ? precomputedAnalysis
      : await kataGoTask.runExact({
          board,
          movesSoFar,
          matchType,
          boardSize,
          modelId: boardSize === 19 ? "b18" : "b10", // 精度優先の要求。フォールバック無し(runExact)なので、
          // b10のDL/ウォームアップが未完了でも待ってから解析する。
          currentPlayer: getNextPlayer(matchType, movesSoFar.length),
        });

    if (
      analysis &&
      isBoardUnfinished(board, boardSize, analysis.ownership, movesSoFar.length)
    ) {
      console.log("終局してないよ");
    }

    const deadStones = analysis
      ? ownershipToDeadStones(board, analysis.ownership)
      : [];

    return { deadStones, analysis };
  };

  return { analyzeTerritory };
}
