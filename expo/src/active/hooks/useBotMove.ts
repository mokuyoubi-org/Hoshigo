// @/src/active/hooks/useBotMove.ts
//
// ─── このhookの責務 ───────────────────────────────────
// KataGoエンジンへの分析依頼と、その結果からボットの最善手を選ぶことだけを担当する。
// rpc送信(add_move)はこのhookの責務ではない。呼び出し側(Playing.tsx)が
// onDecidedコールバックの中で行う。理由：
// 「盤面を分析して手を決める」ことと「その手をサーバに提出する」ことは
// 別の関心事なので、混ぜるとテストしにくくなる。
//
// isBotRunningRef(二重発火防止)は、Playing.tsx側に2箇所あった
// (プレイヤーの手を受けてボットが打つ時／対局開始時にボットが先手の時)
// 同じガード処理を、このhookのrunBotTurnに一本化した。
// ──────────────────────────────────────────────────

import { useKataGoEngine } from "@/src/active/contexts/KataGoEngineContext";
import { getOppositeColor, makeGrid } from "@/src/active/logics/goLogics";
import {
  boardToBoard2D,
  movesToKataGoMoves,
} from "@/src/active/logics/matchLogics";
import { AnalyzeResult } from "@/src/stable/services/web-katrain/analyzeBoard";
import { DEFAULT_MODEL_ID } from "@/src/stable/services/web-katrain/modelManager";
import { FloatArray } from "@/src/stable/services/web-katrain/types";
import {
  Board,
  BoardSize,
  Color,
  Grid,
  MatchType,
} from "@/src/stable/types/goTypes";
import { useRef } from "react";

export function useBotMove(myColor: Color, boardSize: BoardSize) {
  const { engineRef } = useKataGoEngine();
  const isBotRunningRef = useRef(false);

  // 盤面を分析するだけ(着手選択はしない)。
  // 人間同士の対局でも、死石判定用のownershipが欲しい時に使う。
  const analyze = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
  ): Promise<AnalyzeResult> => {
    return engineRef.current!.analyzeBoard({
      board: boardToBoard2D(board, boardSize),
      moves: movesToKataGoMoves(movesSoFar, boardSize, matchType),
      currentPlayer: getOppositeColor(myColor),
      modelId: DEFAULT_MODEL_ID,
      boardSize,
    });
  };

  // 分析した上で、ボットの最善手をgridの形で返す。
  const decideMove = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
  ): Promise<{ grid: Grid; ownership: FloatArray }> => {
    const result = await analyze(board, movesSoFar, matchType);
    const best = result.moves[0];
    return {
      grid: makeGrid(best.y, best.x, boardSize),
      ownership: result.ownership,
    };
  };

  // 二重発火防止つきでボットに考えさせる。
  // 既に思考中なら何もしない(呼び出し側でチェックしなくてよい)。
  const runBotTurn = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
    onDecided: (grid: Grid, ownership: FloatArray) => Promise<void> | void,
  ) => {
    if (isBotRunningRef.current) return;
    isBotRunningRef.current = true;
    try {
      const { grid, ownership } = await decideMove(
        board,
        movesSoFar,
        matchType,
      );
      await onDecided(grid, ownership);
    } finally {
      isBotRunningRef.current = false;
    }
  };

  return { analyze, decideMove, runBotTurn };
}
