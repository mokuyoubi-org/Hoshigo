// expo/src/hooks/ai/useLiveAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中、画面には一切出さずに、手ごとのKataGo解析結果を裏側で溜めて
// おくための保管庫。黒番・白番どちらの手でも、その手が打たれた
// 直後の局面のAnalyzeResultを受け取って記録する。
//
// 次の3つも、ここで一手に引き受ける(対局セッション側はKataGoに直接
// 触らず、ここに頼むだけにするため)。
//  1. 局面を分析して記録する(analyzeAndRecord)。
//  2. 人間の手番の局面を分析して記録し、「自動でパスすべきか」も返す(analyzeForTurn)。
//  3. 「まだ終わっていない分析が何件あるか」の数え係(waitForPending)。
//     投了時など、浮いている分析が全部終わるまで待ちたい時に使う。
//
// 対局終了時、溜まった内容をRecordAnalysis形式(事後分析ループの
// useRecordAnalysisLoopと同じ入れ物)にして返す。BoardEditScreenに渡すのはこの形。
// ──────────────────────────────────────────────────

import { KataGoTaskResult, useKataGoTask } from "@/src/hooks/ai/useKataGoTask";
import { buildMoveAnalysisEntry } from "@/src/logics/game/analysis";
import {
  Board,
  BoardSize,
  endsWithDoublePass,
  Grid,
  isBoardUnfinished,
  MatchType,
  MoveAnalysisEntry,
  PASS_GRID,
  RecordAnalysis,
} from "go-core";
import { useEffect, useRef, useState } from "react";

type UseLiveAnalysisArgs = {
  matchType: MatchType;
  boardSize: BoardSize;
  // 🌟 途中から始める時の、これまでの分析結果(再開する局面までの分)
  initialAnalysis?: RecordAnalysis;
  // 🌟 1局面を記録した直後に呼ばれる。
  //    pos = その局面までに打たれた手数(0 = まだ1手も打たれていない局面)
  onRecorded?: (pos: number, entry: MoveAnalysisEntry) => void;
};

type AnalyzeAndRecordArgs = {
  moveIndex: number; // この局面までに打たれた手数(=movesSoFar.length)
  board: Board;
  movesSoFar: Grid[];
};

type AnalyzeForTurnArgs = AnalyzeAndRecordArgs & {
  // 🌟 true の時だけ、終局の2段階確認をして、強制パスすべきかを調べる。
  //    「今が自分(人間)の手番」の時にだけ true にする。
  checkAutoPass: boolean;
};

export const useLiveAnalysis = ({
  matchType,
  boardSize,
  initialAnalysis,
  onRecorded,
}: UseLiveAnalysisArgs) => {
  // 毎回の描画で最新の関数に差し替える(古い関数を呼んでしまわないように)
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });
  const kataGoTask = useKataGoTask();

  const perMoveRef = useRef<(MoveAnalysisEntry | null)[]>(
    initialAnalysis ? [...initialAnalysis.pos] : [],
  );

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

  // 🌟「判断が終わった局面」の一覧。局面 = その局面までに打たれた手数。
  //   分析が成功した局面も、失敗した局面も、どちらも「終わった」として入れる。
  //   (失敗した時にパスボタンが押せないままにならないように)
  //   画面の再描画のきっかけにしたいので、refではなくstateで持つ。
  //   再開の時は、引き継いだ分析がある局面から始める。
  const [judgedPositions, setJudgedPositions] = useState<Set<number>>(
    () =>
      new Set(
        (initialAnalysis?.pos ?? []).flatMap((entry, index) =>
          entry ? [index] : [],
        ),
      ),
  );

  const markJudged = (moveIndex: number) => {
    if (!isMountedRef.current) return;
    setJudgedPositions((prev) => {
      if (prev.has(moveIndex)) return prev;
      const next = new Set(prev);
      next.add(moveIndex);
      return next;
    });
  };

  // 実行中の分析が1件終わった時の後始末。0件になったら、待っている人たちを起こす。
  const finishPending = () => {
    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
    if (pendingCountRef.current === 0) {
      const resolvers = pendingResolversRef.current;
      pendingResolversRef.current = [];
      resolvers.forEach((resolve) => resolve());
    }
  };

  // 分析結果を保存して、記録できたことを知らせるだけ。
  // 「判断が終わった」印は付けない(付けるタイミングは呼び出し側が決める)。
  // resultがnullの場合は、記録しない。
  const storeEntry = (
    moveIndex: number,
    result: KataGoTaskResult | null,
  ): MoveAnalysisEntry | null => {
    if (!result) return null;
    const entry = buildMoveAnalysisEntry(result);
    const arr = perMoveRef.current;
    while (arr.length <= moveIndex) arr.push(null);
    arr[moveIndex] = entry;
    // 🌟記録できたことを知らせる(サーバーへ送るため)。失敗しても記録自体は守る
    try {
      onRecordedRef.current?.(moveIndex, entry);
    } catch (e) {
      console.error("分析の送信で例外発生:", e);
    }
    return entry;
  };

  // 局面の分析結果を記録する。moveIndex = その局面までに打たれた手数
  // (=movesSoFar.length。0 = まだ1手も打たれていない局面)。
  // movesSoFarは、この分析をした局面までの手の並び。
  // 同じmoveIndexに対して2回呼ばれた場合は、後から呼ばれた方で上書きされる
  // (再送信でやり直した場合の後始末を兼ねる)。
  // resultがnull(二重パス等で分析が取れなかった)の場合は、記録しない。
  // 戻り値は、保存した(仕上げ済みの)エントリ。記録しなかった場合はnull。
  const record = (
    moveIndex: number,
    result: KataGoTaskResult | null,
    movesSoFar: Grid[],
  ): MoveAnalysisEntry | null => {
    const entry = storeEntry(moveIndex, result);
    // 🌟 判断が終わった局面として覚える
    if (entry) markJudged(moveIndex);
    return entry;
  };

  // 局面を分析して、記録まで済ませる。
  // 呼び出し側はawaitしなくてよい(投げっぱなしの背景分析に使う)。
  // awaitすれば、記録が終わるまで待てる(⏹の最新局面分析や、終局の分析に使う)。
  // 戻り値は、保存した(仕上げ済みの)エントリ。分析が取れなかった時や、
  // 画面を離れた後だった時は null。
  // 実行中の件数は数えているので、waitForPendingで全部の完了を待てる。
  const analyzeAndRecord = async ({
    moveIndex,
    board,
    movesSoFar,
  }: AnalyzeAndRecordArgs): Promise<MoveAnalysisEntry | null> => {
    pendingCountRef.current += 1;
    try {
      const analysis = await kataGoTask.run(
        board,
        movesSoFar,
        boardSize,
        matchType,
      );

      if (!isMountedRef.current) return null;

      return record(moveIndex, analysis, movesSoFar);
    } finally {
      // 🌟 成功でも失敗(null・例外)でも、この局面の判断は「終わった」
      markJudged(moveIndex);
      finishPending();
    }
  };

  // 人間の手番になった局面を分析して記録し、「ここで自動でパスすべきか」を返す。
  // 自動でパスする(true)のは、次の3つがすべて当てはまる時だけ。
  //   1. checkAutoPass が true で、直前の相手の手がパス
  //   2. この局面が終局と判定された(1段階目)
  //   3. パスした後の局面も終局と判定された(2段階目)
  // 2段階目の分析が終わるまで、「判断が終わった」印は付けない
  // (=パスボタンも押せないまま。確認中に人間が操作してしまわないように)。
  // 分析の失敗や例外は、すべて false(強制パスしない)。
  const analyzeForTurn = async ({
    moveIndex,
    board,
    movesSoFar,
    checkAutoPass,
  }: AnalyzeForTurnArgs): Promise<boolean> => {
    pendingCountRef.current += 1;
    try {
      const result = await kataGoTask.run(
        board,
        movesSoFar,
        boardSize,
        matchType,
      );
      if (!isMountedRef.current || !result) return false;

      // 分析は保存する(判断が終わった印は、下のfinallyで付ける)
      storeEntry(moveIndex, result);

      const opponentPassed =
        movesSoFar[movesSoFar.length - 1] === PASS_GRID &&
        !endsWithDoublePass(movesSoFar);
      // 🌟 相手が、自分の番ごとに2回連続でパスしている時だけ、強制パスする
      //    (間に自分の手が1手ずつ入るので、2手おきに見る)
      const opponentPassedThreeTimes =
        opponentPassed &&
        movesSoFar.length >= 3 &&
        movesSoFar[movesSoFar.length - 3] === PASS_GRID;
      if (!checkAutoPass || !opponentPassedThreeTimes || !result.isFinal) {
        return false;
      }

      const confirmed = await kataGoTask.isFinalAfterPass(
        movesSoFar,
        boardSize,
        matchType,
      );
      return isMountedRef.current && confirmed;
    } catch (e) {
      console.warn("[useLiveAnalysis] 手番局面の分析で例外が出ました", e);
      return false;
    } finally {
      markJudged(moveIndex);
      finishPending();
    }
  };

  // 「今の局面は、まだ終局していないか」を、保存済みの分析のownershipから判定する。
  // movesSoFarは今の局面までの手の並び(=その局面の分析は pos[movesSoFar.length])。
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

  // 🌟 この局面(=打たれた手数)の判断が終わったか。パスボタンを押せるかどうかに使う。
  //   stateを読んでいるので、判断が終わると画面が再描画される。
  const isPositionJudged = (movesLength: number): boolean =>
    judgedPositions.has(movesLength);

  // 浮いている分析が全部終わるまで待つ。0件ならすぐ解決する。
  const waitForPending = (): Promise<void> => {
    if (pendingCountRef.current === 0) return Promise.resolve();
    return new Promise((resolve) => {
      pendingResolversRef.current.push(resolve);
    });
  };

  // サーバーとのresync等でmoves配列自体が短縮された場合に、それより後ろの
  // ゴミを掃除する。
  const truncate = (length: number) => {
    perMoveRef.current = perMoveRef.current.slice(0, length);
    // 🌟 「判断が終わった」印も掃除する。
    //   今の局面(=length)の印は残す。分析が消えていても、
    //   「判断できない=確認なしでパス」になるだけで、ボタンが固まることはない。
    setJudgedPositions(
      (prev) => new Set(Array.from(prev).filter((i) => i <= length)),
    );
  };

  const getRecordAnalysis = (): RecordAnalysis => ({
    pos: [...perMoveRef.current],
  });

  return {
    record,
    analyzeAndRecord,
    analyzeForTurn,
    waitForPending,
    truncate,
    getRecordAnalysis,
    isPositionUnfinished,
    isPositionJudged,
  };
};
