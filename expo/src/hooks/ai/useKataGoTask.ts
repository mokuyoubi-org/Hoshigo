// useKataGoTask.ts
//
// ─── このhookの責務 ───────────────────────────────────
// kataGo.run() を実際に呼び出す唯一の入口。
//
// 「次に打つ人の色」(currentPlayer)も呼び出し側は渡さなくていい。
// matchTypeとmovesSoFar.lengthから、ここでgetColorToMoveを使って決める。
// (movesSoFarと食い違う色を渡してしまう事故が、原理的に起きなくなる)
// ──────────────────────────────────────────────────

import { printCustomKataGoResult } from "@/src/logics/debug/debugLogics";
import { AnalyzeResult, useKataGo } from "expo-katago";
import { Board, BoardSize, getColorToMove, Grid, MatchType } from "go-core";

type Params = {
  board: Board;
  movesSoFar: Grid[];
  boardSize: BoardSize;
  matchType: MatchType;
};

// ⚠️👍このuseKataGoTaskの存在意義はこのフィールドにあると言って良い。
const fields = {
  scoreSelfplay: false,
  scoreStdev: false,
  visits: false,
  ownershipStdev: false,
  policy: false,
  moveDetails: false,
};

export const useKataGoTask = () => {
  const kataGo = useKataGo();

  const run = async (
    params: Params,
  ): Promise<AnalyzeResult | null> => {

    const currentPlayer = getColorToMove(
      params.matchType,
      params.movesSoFar.length,
    );

    const result = await kataGo.run({
      ...params,
      currentPlayer,
      fields,
    });

    printCustomKataGoResult(
      params.board,
      params.movesSoFar,
      currentPlayer,
      result,
      params.boardSize,
    );

    return result ? { ...result} : null;
  };

  // 🌟kataGo.run→analyzeBoard内のloadModelが
  //   キャッシュに無ければその場でDL・ウォームアップを待ってから
  //   解析するので、単に時間がかかるだけで結果は必ず要求モデル基準になる。
  //   終局の地計算のように「精度が絶対、待ち時間は許容できる」用途専用。
  //   requestIdを渡すと、まだキューに積まれてる間だけcancelQueuedAnalysis
  //   で取り消せるようになる(連打で不要になった編集モードの解析の後始末用)。
  const runExact = async (
    params: Params,
    requestId?: string,
  ): Promise<(AnalyzeResult) | null> => {
    const currentPlayer = getColorToMove(
      params.matchType,
      params.movesSoFar.length,
    );

    const result = await kataGo.run(
      { ...params, currentPlayer, fields },
      requestId,
    );

    printCustomKataGoResult(
      params.board,
      params.movesSoFar,
      currentPlayer,
      result,
      params.boardSize,
    );

    return result ? { ...result } : null;
  };

  return {
    run,
    runExact,
    engineReady: kataGo.engineReady,
    cancelQueuedAnalysis: kataGo.cancelQueuedAnalysis,
  };
};
