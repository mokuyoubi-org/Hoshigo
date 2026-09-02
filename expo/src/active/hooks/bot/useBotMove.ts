// useBotMove.ts
//
// ─── このhookの責務 ───────────────────────────────────
// ボットのusernameを元にどのモデルを使うかを決めてuseKataGoを呼び、
// 返ってきた解析結果から最善手(bestMove)だけを取り出す。
// ──────────────────────────────────────────────────

import { printCustomKataGoResult } from "@/src/stable/logics/debugLogics";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  getOppositeColor,
  Grid,
  makeGrid,
  MatchType,
  PASS_GRID,
  WHITE,
} from "expo-goband";

import { DEFAULT_MODEL_ID, ModelId, useKataGo } from "expo-katago";
import { useRef } from "react";

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
  const kataGo = useKataGo();
  const isBotRunningRef = useRef(false);

  const modelId: ModelId =
    (opponentUsername && BOT_MODEL_MAP[opponentUsername]) || DEFAULT_MODEL_ID;

  const runBotTurn = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
    onDecided: (grid: Grid) => Promise<void> | void,
  ) => {
    if (isBotRunningRef.current) return;

    // matchtypeが2~9の場合: botは必ず白で先手。movesSoFarが奇数ならおかしい。
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

    // 直近2手が連続パス(終局)なら、ボットは考える必要が無い。
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
      console.log(
        `🤖 [useBotMove] 対戦相手: ${opponentUsername ?? "なし(人間戦)"} -> 使用モデル: ${modelId}`,
      );

      // 人間が2回連続でパス（3手前と1手前がパス）していたら、ボットも即座にパスする
      if (
        movesSoFar.length >= 3 &&
        movesSoFar[movesSoFar.length - 1] === PASS_GRID && // 人間の1手前（直前の着手）
        movesSoFar[movesSoFar.length - 3] === PASS_GRID // 人間の2手前（ボットの手を挟むので3手前）
      ) {
        console.log(
          "🤖 [useBotMove] 人間が2回連続パスしたため、ボットも強制パスする",
        );
        await onDecided(PASS_GRID);
        return;
      }

      //

      const result = await kataGo.run({
        board,
        movesSoFar,
        matchType,
        boardSize,
        modelId,
        currentPlayer: getOppositeColor(myColor),
      });

      // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

      // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

      printCustomKataGoResult(
        board,
        movesSoFar,
        getOppositeColor(myColor),
        result,
      );

      // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

      // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

      if (!result || !result.moves || result.moves.length === 0) {
        console.warn("[useBotMove] ボットの着手決定に失敗しました(Skip)");
        return;
      }

      const best = result.moves[0];
      const bestMove: Grid =
        best.x === -1 || best.y === -1
          ? PASS_GRID
          : makeGrid(best.y, best.x, boardSize);

      await onDecided(bestMove);
    } finally {
      isBotRunningRef.current = false;
    }
  };

  return { runBotTurn };
}
