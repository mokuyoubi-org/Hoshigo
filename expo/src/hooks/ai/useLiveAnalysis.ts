// useLiveAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中、画面には一切出さずに、手ごとのKataGo解析結果を裏側で溜めて
// おくための保管庫。黒番・白番どちらの手でも、その手が打たれた
// 直後の局面のAnalyzeResultを受け取って記録する。
//
// 次の3つも、ここで一手に引き受ける(対局セッション側はKataGoに直接
// 触らず、ここに頼むだけにするため)。
//  1. 局面を分析して記録する(analyzeAndRecord)。
//  2. 「直近どの局面をどのanalysisで評価したか」の付箋(キャッシュ)。
//     連続パスで終局する時、パスは盤面を変えないので、直前の局面の
//     analysisをそのまま地計算に使い回せる(getCachedAnalysis)。
//  3. 「まだ終わっていない分析が何件あるか」の数え係(waitForPending)。
//     投了時など、浮いている分析が全部終わるまで待ちたい時に使う。
//
// 対局終了時、溜まった内容をRecordAnalysis形式(事後分析ループの
// useRecordAnalysisLoopと同じ入れ物)にして返す。BoardEditScreenに渡すのはこの形。
// ──────────────────────────────────────────────────

import { AnalyzeResult } from "@/packages/expo-katago/src";
import { useKataGoTask } from "@/src/hooks/ai/useKataGoTask";
import { buildMoveAnalysisEntry } from "@/src/logics/game/analysis";
import {
  Board,
  BoardSize,
  Grid,
  isBoardUnfinished,
  MatchType,
  MoveAnalysisEntry,
  RecordAnalysis,
} from "go-core";
import { useEffect, useRef } from "react";

// 「直近に分析した局面」の付箋。moveCountは「その解析時点でのmovesSoFar.length
// (=これから打たれる手のインデックス)」。地計算が
// 「このモデルなら使い回してよいか」を判断するために、そのまま渡す。
type LastPositionAnalysis = {
  moveCount: number;
  analysis: AnalyzeResult | null;
};

const NO_CACHE: LastPositionAnalysis = { moveCount: -1, analysis: null };

type UseLiveAnalysisArgs = {
  matchType: MatchType;
  boardSize: BoardSize;
  // 🌟 途中から始める時の、これまでの分析結果(再開する局面までの分)
  initialAnalysis?: RecordAnalysis;
};

type AnalyzeAndRecordArgs = {
  moveIndex: number; // この局面で打たれる手のインデックス(=movesSoFar.length)
  board: Board;
  movesSoFar: Grid[];
};

export const useLiveAnalysis = ({
  matchType,
  boardSize,
  initialAnalysis,
}: UseLiveAnalysisArgs) => {
  const kataGoTask = useKataGoTask();

  const perMoveRef = useRef<(MoveAnalysisEntry | null)[]>(
    initialAnalysis ? [...initialAnalysis.perMove] : [],
  );
  const lastPositionRef = useRef<LastPositionAnalysis>(NO_CACHE);

  // 🌟画面離脱後に、遅れて届いた分析結果を記録してしまわないためのガード
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 🌟「まだ完了していない分析」の件数と、全部終わるのを待っている人たち
  const pendingCountRef = useRef(0);
  const pendingResolversRef = useRef<(() => void)[]>([]);

  // moveIndex(0-indexed、その手が打たれた直後の局面)にAnalyzeResultを記録する。
  // movesSoFarは、この分析をした局面までの手の並び。確定した終局局面かどうかを
  // 判断して、確定ならgoscorerの結果で仕上げてから保存するために使う。
  // 同じmoveIndexに対して2回呼ばれた場合は、後から呼ばれた方で上書きされる
  // (再送信でやり直した場合の後始末を兼ねる)。
  // 🌟「直近に分析した局面」の付箋も、ここで一緒に更新する。付箋には、仕上げ前の
  // 生のresultを残す(地計算が、KataGoの生のownershipを使い回すため)。
  // resultがnull(二重パス等で分析が取れなかった)の場合は、記録はしないが
  // 付箋にはnullを残す(「この局面は分析できなかった」という事実を、古い付箋と
  // 取り違えないため)。
  // 戻り値は、保存した(仕上げ済みの)エントリ。記録しなかった場合はnull。
  const record = (
    moveIndex: number,
    result: AnalyzeResult | null,
    movesSoFar: Grid[],
  ): MoveAnalysisEntry | null => {
    lastPositionRef.current = { moveCount: moveIndex, analysis: result };
    if (!result) return null;
    const entry = buildMoveAnalysisEntry(result, {
      boardSize,
      matchType,
      movesSoFar,
    });
    const arr = perMoveRef.current;
    while (arr.length <= moveIndex) arr.push(null);
    arr[moveIndex] = entry;
    return entry;
  };

  // 局面を分析して、記録(と付箋の更新)まで済ませる。
  // 呼び出し側はawaitしなくてよい(投げっぱなしの背景分析に使う)。
  // awaitすれば、記録が終わるまで待てる(⏹の最新局面分析に使う)。
  // 実行中の件数は数えているので、waitForPendingで全部の完了を待てる。
  const analyzeAndRecord = async ({
    moveIndex,
    board,
    movesSoFar,
  }: AnalyzeAndRecordArgs): Promise<void> => {
    pendingCountRef.current += 1;
    try {
      const analysis = await kataGoTask.run({
        board,
        movesSoFar,
        matchType,
        boardSize,
      });

      if (!isMountedRef.current) return;

      record(moveIndex, analysis, movesSoFar);
    } finally {
      pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
      if (pendingCountRef.current === 0) {
        const resolvers = pendingResolversRef.current;
        pendingResolversRef.current = [];
        resolvers.forEach((resolve) => resolve());
      }
    }
  };

  // 「moveIndex手目を打つ前の局面」の付箋が貼ってあれば、そのanalysisを返す。
  // 貼ってなければ(別の局面の付箋、または付箋なし)undefinedを返す。
  // 分析に失敗していた場合はnullを返す。
  // ※使い回してよいモデルかどうかは、ここでは見ない。
  //   地計算側(useFinalPositionAnalysisのanalyzeTerritory)が判断する。
  const getCachedAnalysis = (
    moveIndex: number,
  ): AnalyzeResult | null | undefined =>
    lastPositionRef.current.moveCount === moveIndex
      ? lastPositionRef.current.analysis
      : undefined;

  // 「今の局面は、まだ終局していないか」を、保存済みの分析のownershipから判定する。
  // movesSoFarは今の局面までの手の並び(=その局面の分析は perMove[movesSoFar.length])。
  //  - true : 未終局と判定された
  //  - false: 終局していると判定された
  //  - null : 判定できない(分析がまだ届いていない/取れなかった)
  const isPositionUnfinished = (
    board: Board,
    movesSoFar: Grid[],
  ): boolean | null => {
    const entry = perMoveRef.current[movesSoFar.length];
    if (!entry || entry.ownership.length === 0) return null;
    return isBoardUnfinished(
      board,
      boardSize,
      entry.ownership,
      movesSoFar.length,
    );
  };

  // 浮いている分析が全部終わるまで待つ。0件ならすぐ解決する。
  const waitForPending = (): Promise<void> => {
    if (pendingCountRef.current === 0) return Promise.resolve();
    return new Promise((resolve) => {
      pendingResolversRef.current.push(resolve);
    });
  };

  // サーバーとのresync等でmoves配列自体が短縮された場合に、それより後ろの
  // ゴミを掃除する。付箋も「どの局面のものか保証できなくなる」ので一緒に捨てる。
  const truncate = (length: number) => {
    perMoveRef.current = perMoveRef.current.slice(0, length);
    lastPositionRef.current = NO_CACHE;
  };

  const getRecordAnalysis = (): RecordAnalysis => ({
    perMove: [...perMoveRef.current],
  });

  return {
    record,
    analyzeAndRecord,
    getCachedAnalysis,
    waitForPending,
    truncate,
    getRecordAnalysis,
    isPositionUnfinished,
  };
};
