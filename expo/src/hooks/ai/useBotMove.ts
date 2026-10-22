// expo/src/hooks/ai/useBotMove.ts
//
// ─── このhookの責務 ───────────────────────────────────
// ボットのusernameを元にどのモデルを使うかを決めてuseKataGoTaskを呼び、
// 返ってきた解析結果を botSelectMove に渡して、次の手(パス含む)を決めてもらう。
//
// 2026/09/07: botの着手を決めるためのkataGo呼び出しは、その局面(直前の
// 相手の手の直後)の分析結果そのものでもある。もう一度別に呼び直す
// 無駄を避けるため、onDecidedにbestMoveと一緒にanalysisも渡す。
//
// 「今、このbotの手番か？」は、本番対局でも練習対局でも同じルール
// (置き石の有無と手数だけで決まる)なので、getColorToMoveで1か所にまとめた。
// 手の選び方とパスの判断は、すべて botSelectMove に任せている。
// このhookは、KataGoを呼んで待つ段取りだけを担当する。
// 終局の2段階確認の2段階目(パス後の局面の分析)も、useKataGoTaskの
// isFinalAfterPassに頼むだけ。
// ──────────────────────────────────────────────────

import { BotUsername } from "@/src/constants/botProfiles";
import { KataGoTaskResult, useKataGoTask } from "@/src/hooks/ai/useKataGoTask";
import { botSelectMove } from "@/src/logics/bot/botSelectMove";

import {
  Board,
  BoardSize,
  Color,
  endsWithDoublePass,
  getColorToMove,
  Grid,
  MatchType,
} from "go-core";
import { useRef } from "react";

export const useBotMove = (
  botColor: Color,
  boardSize: BoardSize,
  botUsername: BotUsername,
) => {
  const kataGoTask = useKataGoTask();
  const isBotRunningRef = useRef(false);

  // 戻り値: KataGoの分析そのものに失敗して、着手を決められなかった時だけ false。
  //   (手を決めて onDecided を呼んだ時や、手番ガードなどで何もしなかった時は true)
  //   呼び出し側は false を見て、やり直すか、諦めるかを決める。
  //   ※分析は成功したのに候補手が0件の時は、失敗ではなく、botSelectMove がパスにする。
  const runBotTurn = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
    // ⚠️2026/09/19: kataGoTask.run は実際に使われたモデルID(フォールバック
    // 後の実モデル)もanalysisに含めて返すようになった。呼び出し側(例:
    // usePracticeSessionの終局地計算キャッシュ判定)がそれを利用できるよう、
    // そのまま素通しする。
    onDecided: (
      grid: Grid,
      analysis: KataGoTaskResult | null,
    ) => Promise<void> | void,
  ): Promise<boolean> => {
    if (isBotRunningRef.current) return true;

    // ⚠️手番ガード: 今がこのbotの手番でなければ何もしない。
    //   手番は、置き石の有無(matchType)と、これまでの手数(movesSoFar.length)
    //   だけで決まる(getColorToMove)。本番でも練習でも同じルール。
    if (getColorToMove(matchType, movesSoFar.length) !== botColor) return true;

    // ⚠️直近2手が連続パス(終局)なら、ボットは考える必要が無い。
    // ※多重推論によるクラッシュ対策としては、今はKataGoEngineContext側の
    //   runAnalysisが直列化で担保している。これは純粋にゲームロジック上の
    //   ガード(終局後にボットに無駄な着手を送らせない)。
    if (endsWithDoublePass(movesSoFar)) {
      console.log(
        "🤖 [useBotMove] 終局（連続パス）のためBot思考をスキップします",
      );
      return true;
    }

    isBotRunningRef.current = true;
    try {
      let result: KataGoTaskResult | null = null;
      try {
        result = await kataGoTask.run(board, movesSoFar, boardSize, matchType);
      } catch (e) {
        console.warn("[useBotMove] KataGoの分析で例外が出ました", e);
      }

      // 分析そのものが失敗した時だけ、やり直し(false)にする。
      if (!result) {
        console.warn("[useBotMove] ボットの着手決定に失敗しました", {
          movesCount: movesSoFar.length,
        });
        return false;
      }

      // 次の手(パス含む)は、botSelectMove が決める。
      // 候補が0件でも、ここでは失敗にせず、botSelectMove にパスを選ばせる。
      const selectedMove = await botSelectMove({
        dames: result.dames,
        candidates: result.candidates,
        movesSoFar,
        isFinal: result.isFinal,
        boardSize,
        matchType,
        botUsername,
        isFinalAfterPass: () =>
          kataGoTask.isFinalAfterPass(movesSoFar, boardSize, matchType),
      });

      await onDecided(selectedMove, result);
      return true;
    } finally {
      isBotRunningRef.current = false;
    }
  };

  return { runBotTurn };
};
