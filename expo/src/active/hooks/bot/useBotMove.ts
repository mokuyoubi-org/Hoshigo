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
        await onDecided(PASS_GRID, null);
        return;
      }

      // 初手はハードコード

      // if(movesSoFar.length === 0){
      //   if(matchType === 0){}
      //   else{
      //     // matchType1はbotは必ず後攻なのであり得ない。なので置き碁の場合ということになる
      //     if(boardSize === 9){
      //       if(matchType === 2){}else if(matchType === 3){}else if(matchType === 4){}else if(matchType === 5){}
      //     }
      //     else if(boardSize === 13){
      //       if(matchType === 2){}else if(matchType === 3){}else if(matchType === 4){}else if(matchType === 5){}else if(matchType === 6){}else if(matchType === 7){}else if(matchType === 8){}else if(matchType === 9){}
      //     }

      //   }
      //    await onDecided(, null);
      // }

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

      // 1手目: ハードコードする。
      // 2or3手目: 最善手40%, 2番手24%, 3番手18%, 4番手12%, 5番手6%
      // 4or5手目: 最善手60%, 2番手16%, 3番手12%, 4番手8%, 5番手4%
      // 6or7手目: 最善手80%, 2番手8%, 3番手6%, 4番手4%, 5番手2%
      // 8手目以降: 最善手100%

      const best = result.moves[0];
      const bestMove: Grid =
        best.x === -1 || best.y === -1
          ? PASS_GRID
          : makeGrid(best.y, best.x, boardSize);

      // ⚠️bot3のmatchType===5つまり5子局は、初手からパスしてしまうので、それを禁止する。
      // 10手も経ってないのにパスするのは禁止 ⚠️これを20とかにすると流石に意味わからん手を打つようになるのでng
      if (
        modelId === "b18" &&
        matchType === 5 &&
        movesSoFar.length < 10 &&
        bestMove === PASS_GRID
      ) {
        const best2 = result.moves[1];
        const bestMove2 = makeGrid(best2.y, best2.x, boardSize);
        await onDecided(bestMove2, result);
        return;
      }

      await onDecided(bestMove, result);
    } finally {
      isBotRunningRef.current = false;
    }
  };

  return { runBotTurn };
}
