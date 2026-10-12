// useBotMove.ts
//
// ─── このhookの責務 ───────────────────────────────────
// ボットのusernameを元にどのモデルを使うかを決めてuseKataGoTaskを呼び、
// 返ってきた解析結果から最善手(bestMove)だけを取り出す。
//
// 2026/09/07: botの着手を決めるためのkataGo呼び出しは、その局面(直前の
// 相手の手の直後)の分析結果そのものでもある。もう一度別に呼び直す
// 無駄を避けるため、onDecidedにbestMoveと一緒にanalysisも渡す。
//
// 「今、このbotの手番か？」は、本番対局でも練習対局でも同じルール
// (置き石の有無と手数だけで決まる)なので、getColorToMoveで1か所にまとめた。
// 強制パスの判定は、shouldBotForcePassに任せている。
// ──────────────────────────────────────────────────

import { BotUsername, } from "@/src/constants/botProfiles";
import { useKataGoTask } from "@/src/hooks/ai/useKataGoTask";
import { decideBotFirstMove } from "@/src/logics/bot/decideBotFirstMove";
import { selectBotCandidateMove } from "@/src/logics/bot/selectBotCandidateMove";
import { shouldBotForcePass } from "@/src/logics/bot/shouldBotForcePass";
import { shouldBotPassAfterOpponentPass } from "@/src/logics/bot/shouldBotPassAfterOpponentPass";
import { endsWithDoublePass } from "@/src/logics/game/endsWithDoublePass";
import { AnalyzeResult, } from "expo-katago";
import {
  Board,
  BoardSize,
  Color,
  getColorToMove,
  Grid,
  makeGrid,
  MatchType,
  PASS_GRID,
} from "go-core";
import { useRef } from "react";

export const useBotMove = (
  botColor: Color,
  boardSize: BoardSize,
  botUsername: BotUsername,
) => {
  const kataGoTask = useKataGoTask();
  const isBotRunningRef = useRef(false);

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
      analysis: (AnalyzeResult) | null,
    ) => Promise<void> | void,
  ) => {
    if (isBotRunningRef.current) return;

    // ⚠️手番ガード: 今がこのbotの手番でなければ何もしない。
    //   手番は、置き石の有無(matchType)と、これまでの手数(movesSoFar.length)
    //   だけで決まる(getColorToMove)。本番でも練習でも同じルール。
    if (getColorToMove(matchType, movesSoFar.length) !== botColor) return;

    // ⚠️直近2手が連続パス(終局)なら、ボットは考える必要が無い。
    // ※多重推論によるクラッシュ対策としては、今はKataGoEngineContext側の
    //   runAnalysisが直列化で担保している。これは純粋にゲームロジック上の
    //   ガード(終局後にボットに無駄な着手を送らせない)。
    if (endsWithDoublePass(movesSoFar)) {
      console.log(
        "🤖 [useBotMove] 終局（連続パス）のためBot思考をスキップします",
      );
      return;
    }

    isBotRunningRef.current = true;
    try {
      const result = await kataGoTask.run({
        board,
        movesSoFar,
        matchType,
        boardSize,
      });

      if (!result || !result.moves || result.moves.length === 0) {
        console.warn("[useBotMove] ボットの着手決定に失敗しました(Skip)");
        return;
      }

      // ⚠️人間が連続でパスしていたら、ボットも即座にパスする(詳細な条件は
      // shouldBotForcePass側に集約)。
      if (shouldBotForcePass(boardSize, movesSoFar)) {
        console.log(
          "🤖 [useBotMove] 人間が連続パスしたため、ボットも強制パスする",
        );
        await onDecided(PASS_GRID, result); // 💡実際にbotの手は使用しないが、ちゃんとkatagoを回し、resultを返すことが大事
        return;
      }

      // 手数（これまでに打たれた手の数）
      const moveCount = movesSoFar.length;

      // 1手目: ハードコード（条件に合う場合）
      if (moveCount === 0) {
        const grid = decideBotFirstMove(matchType, boardSize);
        console.log("ハードコードされた初手: ", grid);
        await onDecided(grid, result); // 💡実際にbotの手は使用しないが、ちゃんとkatagoを回し、resultを返すことが大事
        return;
      }

      // ⚠️相手がパスしていて、最善手がパスより得をしないなら、ボットもパスして終局へ
      if (shouldBotPassAfterOpponentPass(botColor, movesSoFar, result.moves)) {
        console.log(
          "🤖 [useBotMove] 相手のパス後、打っても得が無いためパスする",
        );
        await onDecided(PASS_GRID, result);
        return;
      }

      // 2手目以降: 手数と盤サイズに応じた重み付きランダムで1手選ぶ
      // (揺らぎ区間を過ぎたら常に最善手。詳細な計算はselectBotCandidateMove側に集約)
      const selectedMove = selectBotCandidateMove(
        result.moves,
        moveCount,
        boardSize,
        botUsername,
      );

      const chosenGrid: Grid =
        selectedMove.x === -1 || selectedMove.y === -1
          ? PASS_GRID
          : makeGrid(selectedMove.y, selectedMove.x, boardSize);

      await onDecided(chosenGrid, result); // 💡実際にbotの手は使用する
    } finally {
      isBotRunningRef.current = false;
    }
  };

  return { runBotTurn };
};
