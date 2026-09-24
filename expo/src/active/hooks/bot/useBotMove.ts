// useBotMove.ts
//
// ─── このhookの責務 ───────────────────────────────────
// ボットのusernameを元にどのモデルを使うかを決めてuseKataGoTaskを呼び、
// 返ってきた解析結果から最善手(bestMove)だけを取り出す。
//
// 2026/09/07: botの着手を決めるためのkataGo呼び出しは、その局面(直前の
// 相手の手の直後)の分析結果そのものでもある。もう一度別に呼び直す
// 無駄を避けるため、onDecidedにbestMoveと一緒にanalysisも渡す。
// ──────────────────────────────────────────────────

import { decideBotFirstMove } from "@/src/stable/logics/bot/decideBotFirstMove";
import { selectBotCandidateMove } from "@/src/stable/logics/bot/selectBotCandidateMove";
import { AnalyzeResult, DEFAULT_MODEL_ID, ModelId } from "expo-katago";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  MatchType,
  PASS_GRID,
  WHITE,
  makeGrid,
} from "go-core";
import { useRef } from "react";
import { useKataGoTask } from "./useKataGoTask";

// ★ボットのユーザー名とモデルIDの対応表
const BOT_MODEL_MAP: Record<string, ModelId> = {
  bot1: "b6",
  bot2: "b10",
  bot3: "b18",
};

export function useBotMove(
  botColor: Color,
  boardSize: BoardSize,
  opponentUsername?: string,
) {
  const kataGoTask = useKataGoTask();
  const isBotRunningRef = useRef(false);

  const modelId: ModelId =
    (opponentUsername && BOT_MODEL_MAP[opponentUsername]) || DEFAULT_MODEL_ID;

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
      analysis: (AnalyzeResult & { modelId: ModelId }) | null,
    ) => Promise<void> | void,
    isPractice: boolean,
  ) => {
    if (isBotRunningRef.current) return;

    if (!isPractice) {
      // 本番対局。
      // ⚠️matchtypeが2~9の場合: botは必ず白で先手。movesSoFarが奇数ならおかしい。
      // matchtypeが1の場合: botは必ず白で後手。movesSoFarが偶数ならおかしい。
      // matchtypeが0の場合: myColorがBLACKの場合、movesSoFarが偶数ならおかしい。myColorがWHITEの場合、movesSoFarが奇数ならおかしい。
      if (2 <= matchType && movesSoFar.length % 2 !== 0) {
        return;
      } else if (matchType === 1 && movesSoFar.length % 2 === 0) {
        return;
      } else if (
        matchType === 0 &&
        movesSoFar.length % 2 === 0 &&
        botColor === WHITE
      ) {
        return;
      } else if (
        matchType === 0 &&
        movesSoFar.length % 2 !== 0 &&
        botColor === BLACK
      ) {
        return;
      }
    } else {

   
      // 練習対局
      // もしボットが先手かつこれまでの手数が奇数ならreturn
      if (
        (((matchType === 0 || matchType === 1) && botColor === BLACK) ||
          (matchType >= 2 && botColor === WHITE)) &&
        movesSoFar.length % 2 !== 0
      ) {
        return;
      } else if (
        (((matchType === 0 || matchType === 1) && botColor === WHITE) ||
          (matchType >= 2 && botColor === BLACK)) &&
        movesSoFar.length % 2 === 0
      ) {
        // もしボットが後手かつこれまでの手数が偶数ならreturn
        return;
      }
    }

    // ⚠️直近2手が連続パス(終局)なら、ボットは考える必要が無い。
    // ※多重推論によるクラッシュ対策としては、今はKataGoEngineContext側の
    //   runAnalysisが直列化で担保している。これは純粋にゲームロジック上の
    //   ガード(終局後にボットに無駄な着手を送らせない)。
    const len = movesSoFar.length;
    const isDoublePass =
      len >= 2 &&
      movesSoFar[len - 1] === PASS_GRID &&
      movesSoFar[len - 2] === PASS_GRID;
    if (isDoublePass) {
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
        modelId,
        currentPlayer: botColor,
      });



      if (!result || !result.moves || result.moves.length === 0) {
        console.warn("[useBotMove] ボットの着手決定に失敗しました(Skip)");
        return;
      }

      // ⚠️人間が3回連続でパスしていたら、ボットも即座にパスする
      // 5路盤の場合レートにも関らないので二回パスしたら強制パスでいい。
      if (
        boardSize === 5 &&
        movesSoFar.length >= 3 &&
        movesSoFar[movesSoFar.length - 1] === PASS_GRID &&
        movesSoFar[movesSoFar.length - 3] === PASS_GRID // 人間の2手前（ボットの手を挟むので3手前）
      ) {
        console.log("[5路] 人間が2回連続パスしたため、ボットも強制パス");
        await onDecided(PASS_GRID, result); // 💡実際にbotの手は使用しないが、ちゃんとkatagoを回し、resultを返すことが大事
        return;
      } else if (
        // 9, 13, 19路盤はレートがある
        ((boardSize === 9 && movesSoFar.length >= 50) || // 81
          (boardSize === 13 && movesSoFar.length >= 100) || // 169
          (boardSize === 19 && movesSoFar.length >= 200)) && // 381
        movesSoFar[movesSoFar.length - 1] === PASS_GRID &&
        movesSoFar[movesSoFar.length - 3] === PASS_GRID && // 人間の1手前（直前の着手）
        movesSoFar[movesSoFar.length - 5] === PASS_GRID // 人間の2手前（ボットの手を挟むので3手前）
      ) {
        console.log(
          "🤖 [useBotMove] 人間が3回連続パスしたため、ボットも強制パスする",
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

      // 2手目以降: 手数と盤サイズに応じた重み付きランダムで1手選ぶ
      // (揺らぎ区間を過ぎたら常に最善手。詳細な計算はselectBotCandidateMove側に集約)
      const selectedMove = selectBotCandidateMove(
        result.moves,
        moveCount,
        boardSize,
        modelId,
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
}
