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
  getOppositeColor,
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
  myColor: Color,
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
    onDecided: (
      grid: Grid,
      analysis: AnalyzeResult | null,
    ) => Promise<void> | void,
  ) => {
    if (isBotRunningRef.current) return;

    // ⚠️matchtypeが2~9の場合: botは必ず白で先手。movesSoFarが奇数ならおかしい。
    // matchtypeが1の場合: botは必ず白で後手。movesSoFarが偶数ならおかしい。
    // matchtypeが0の場合: myColorがBLACKの場合、movesSoFarが偶数ならおかしい。myColorがWHITEの場合、movesSoFarが奇数ならおかしい。
    let isGuusuu = false;
    if (movesSoFar.length % 2 === 0) {
      isGuusuu = true;
    }
    if (2 <= matchType && !isGuusuu) {
      return;
    } else if (matchType === 1 && isGuusuu) {
      return;
    } else if (matchType === 0 && isGuusuu && myColor === BLACK) {
      return;
    } else if (matchType === 0 && !isGuusuu && myColor === WHITE) {
      return;
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
        currentPlayer: getOppositeColor(myColor),
      });

      if (!result || !result.moves || result.moves.length === 0) {
        console.warn("[useBotMove] ボットの着手決定に失敗しました(Skip)");
        return;
      }

      // ⚠️人間が2回連続でパス（3手前と1手前がパス）していたら、ボットも即座にパスする
      if (
        ((boardSize === 9 && movesSoFar.length >= 50) ||
          (boardSize === 13 && movesSoFar.length >= 100) ||
          (boardSize === 19 && movesSoFar.length >= 200)) &&
        movesSoFar[movesSoFar.length - 1] === PASS_GRID && // 人間の1手前（直前の着手）
        movesSoFar[movesSoFar.length - 3] === PASS_GRID // 人間の2手前（ボットの手を挟むので3手前）
      ) {
        console.log(
          "🤖 [useBotMove] 人間が2回連続パスしたため、ボットも強制パスする",
        );
        await onDecided(PASS_GRID, result); // 💡実際にbotの手は使用しないが、ちゃんとkatagoを回し、resultを返すことが大事
        return;
      }

      // 手数（これまでに打たれた手の数）
      const moveCount = movesSoFar.length;

      // 1手目: ハードコード（条件に合う場合）
      if (moveCount === 0 && boardSize === 9 && matchType !== 1) {
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
