// expo/src/hooks/ai/useKataGoTask.ts
//
// ─── このhookの責務 ───────────────────────────────────
// expo-katagoとやり取りする窓口。
//  - run: 局面を分析して、仕上げ済みの結果を返す。
//  - isFinalAfterPass: 「パスした後の局面」を分析して、終局と判定されるかを返す。
//    終局の2段階確認の2段階目。bot側も人間側もここを使う。
//  - go-coreの形 → expo-katago(web-katrain)の形への変換も、ここでやる。
//    (石の色: 数字→文字列 / 盤面: 数字→文字列とnull / 座標: 1始まり⇄0始まり)
// ──────────────────────────────────────────────────

// srcの世界では、
// ownership: "BBBWWBB...W.BBBWB"みたいな、BとWと.のみからなる、長さboardSize*boardSizeのstring。
import { useKataGo } from "expo-katago";
import {
  Board,
  BoardSize,
  colorToPlayer,
  finalizeAnalysis,
  getColorToMove,
  Grid,
  KOMI,
  MatchType,
  movesToBoardHistory,
  movesToMoveObjects,
  Ownership,
  PASS_GRID,
  rawMovesToCandidates,
  toBoardState,
  toOneBased,
  toPercent,
} from "go-core";
import { enqueueKataGo } from "./kataGoQueue";

// 🌟analyzeBoardに送り返してきて欲しい情報だけ書く
const fields = {
  winRate: true,
  ownership: true,
  moves: { winRate: true },
} as const;

export interface KataGoTaskResult {
  winRate: number;
  candidates: Grid[];
  ownership: Ownership;
  scoreLead: number;
  isFinal: boolean; // 終局と判定された局面か
  dames: Grid[]; // ダメの空点。なので日本ルールでは打っても仕方のないところ
}

export const useKataGoTask = () => {
  const kataGo = useKataGo();

  const run = async (
    board: Board,
    movesSoFar: Grid[],
    boardSize: BoardSize,
    matchType: MatchType,
  ): Promise<KataGoTaskResult | null> => {
    const currentPlayer = colorToPlayer(
      getColorToMove(matchType, movesSoFar.length),
    );
    const moves = movesToMoveObjects(movesSoFar, boardSize, matchType);

    // 🌟 受付係を通す(前の分析が終わるまで、ここで順番待ちになる)
    const result = await enqueueKataGo(() =>
      kataGo.run({
        board: toBoardState(board, boardSize),
        moves,
        currentPlayer,
        boardSize,
        komi: matchType === 0 ? KOMI : 0, // ⚠️大事
        fields,
      }),
    );
    if (!result) return null;

    // 🌟 地が、ちゃんと返ってこなかった分析は、偽物を作らずに失敗(null)にする
    //    (長さが合わない / 全部ちょうど0 = 本物のKataGoでは、まず起きない)
    const rawOwnership = result.ownership
      ? Array.from(result.ownership as ArrayLike<number>)
      : [];
    if (
      rawOwnership.length !== boardSize * boardSize ||
      rawOwnership.every((v) => v === 0)
    ) {
      console.warn(
        "[useKataGoTask] 地が空だったので、失敗にします",
        movesSoFar.length,
        "手目 / 勝率:",
        result.winRate,
        "/ 地の長さ:",
        rawOwnership.length,
      );
      return null;
    }

    // x, y 形式から grid 形式へ変換する(0始まり → 1始まりに戻してから)
    const candidateMoves = rawMovesToCandidates(
      (result.moves ?? []).map((m) => ({
        ...m,
        x: toOneBased(m.x),
        y: toOneBased(m.y),
      })),
      boardSize,
    );

    const { ownership, scoreLead, winRate, candidates, isFinal, dames } =
      finalizeAnalysis(
        board,
        boardSize,
        matchType,
        movesSoFar,
        rawOwnership,
        toPercent(result.winRate ?? 0.5),
        candidateMoves,
      );

    // 🌟 終局ではないのに、KataGoが勝率を返さなかった分析は、偽の50を使わずに失敗にする
    //    (終局なら、勝率はgoscorerの結果で決まるので、なくてもよい)
    if (!isFinal && result.winRate == null) {
      console.warn("[useKataGoTask] 勝率が返ってこなかったので、失敗にします");
      return null;
    }

    return { winRate, candidates, ownership, scoreLead, isFinal, dames };
  };

  // 「今の局面でパスした後の局面」を分析して、終局と判定されるかを返す。
  // 盤面が作れない時、分析に失敗した時、例外が出た時は false。
  // (=「終局を確定させない」側に倒す。パスせず、普通に手を打つ)
  const isFinalAfterPass = async (
    movesSoFar: Grid[],
    boardSize: BoardSize,
    matchType: MatchType,
  ): Promise<boolean> => {
    try {
      const movesAfter = [...movesSoFar, PASS_GRID];
      const { boardHistory } = movesToBoardHistory(
        boardSize,
        matchType,
        movesAfter,
      );
      const boardAfter = boardHistory[boardHistory.length - 1];
      if (!boardAfter) return false;

      const after = await run(boardAfter, movesAfter, boardSize, matchType);
      return after?.isFinal ?? false;
    } catch (e) {
      console.warn("[useKataGoTask] パス後の局面の分析で例外が出ました", e);
      return false;
    }
  };

  return {
    run,
    isFinalAfterPass,
    engineReady: kataGo.engineReady,
  };
};
