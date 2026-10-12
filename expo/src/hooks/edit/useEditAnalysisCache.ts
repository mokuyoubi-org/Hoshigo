// useEditAnalysisCache.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 編集で積んだ分析結果(editableAnalysis)のキャッシュと、本編分析との
// 合成(combinedAnalysis)を担当する。着手の管理には一切関知しない。
//
// 「今の分岐/編集セッション」を世代(generation)として管理し、分岐が起きた
// (巻き戻して別の手を打った)時や編集モードを抜けた時に、その世代の解析
// リクエストをまとめてキャンセルする(cancelPendingAnalysis)。世代が違う
// 結果は、たとえ後から届いても保存しない(runAndStoreAnalysis内のチェック)。
// これにより、目を閉じていても常に推論を行いながら連打を許可しつつ、
// 不要になった仕事がキューに残り続けるのを防いでいる。
// ──────────────────────────────────────────────────

import { useKataGoTask } from "@/src/hooks/ai/useKataGoTask";
import { EMPTY_ENTRY, mergeAnalysis } from "@/src/logics/game/analysisMerge";
import { buildMoveAnalysisEntry } from "@/src/logics/game/analysis";
import {
  Board,
  BoardSize,
  Grid,
  MatchType,
  MoveAnalysisEntry,
  RecordAnalysis,
} from "go-core";
import { useId, useMemo, useRef, useState } from "react";

export const useEditAnalysisCache = (
  recordAnalysis: RecordAnalysis | null | undefined,
  matchType: MatchType,
  boardSize: BoardSize,
  totalMoves: number,
  branchIndex: number | null,
) => {
  const kataGoTask = useKataGoTask();
  const [editableAnalysis, setEditableAnalysis] = useState<
    (MoveAnalysisEntry | null)[]
  >([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 🐱 このhookインスタンス自身を一意に識別するID(requestIdの衝突防止用)。
  //    useIdはReactが発行する、再描画しても変わらないインスタンス固有のID。
  const instanceId = useId();

  // 🐱 「今の分岐/編集セッション」を表す世代番号。同じ世代の間に発行された
  //    複数の解析リクエストは全部同じrequestId(gen-N)を共有し、まとめて
  //    キャンセル対象にできる。分岐が起きた時・編集モードを抜けた時だけ
  //    この番号を進める(=古い世代の解析はもう無関係になる)。
  const generationRef = useRef(0);

  // 🐱 連打で複数件が同時に(直列だが)進行しうるので、真偽値ではなく
  //    「今何件走ってるか」で数える。0に戻った時だけisAnalyzingをfalseにする。
  const inFlightCountRef = useRef(0);

  const currentRequestId = () =>
    `edit-${instanceId}-gen-${generationRef.current}`;

  const storeEditableAnalysis = (
    moveIndex: number,
    entry: MoveAnalysisEntry | null,
  ) => {
    setEditableAnalysis((prev) => {
      const next = [...prev];
      while (next.length <= moveIndex) next.push(null);
      next[moveIndex] = entry;
      return next;
    });
  };

  const combinedAnalysis = useMemo(
    () =>
      mergeAnalysis(recordAnalysis, editableAnalysis, branchIndex, totalMoves),
    [recordAnalysis, editableAnalysis, branchIndex, totalMoves],
  );

  // 🐱 moveIndex手目を打つ前の局面をkataGoで分析し、キャッシュに書き込む唯一の入口。
  //    呼び出し元はawaitせず投げっぱなしにしてよい(連打を妨げないため)。
  const runAndStoreAnalysis = async (
    moveIndex: number,
    board: Board,
    movesSoFar: Grid[],
  ): Promise<MoveAnalysisEntry | null> => {
    const myGeneration = generationRef.current;
    inFlightCountRef.current++;
    setIsAnalyzing(true);
    try {
      // 🌟runExact(フォールバック無し)を使用。ここでキャッシュされる結果は
      //   地表示(combinedAnalysis経由)などにも使われるため、モデルが未準備でも
      //   待ってでも必ずANALYSIS_MODEL_IDの結果を使う。
      const result = await kataGoTask.runExact(
        {
          board,
          movesSoFar,
          matchType,
          boardSize,
        },
        currentRequestId(),
      );

      // 実行中/キュー中に分岐や編集モード終了が起きて世代が進んでいたら、
      // この結果はもう関係ない局面のものなので捨てる。
      if (myGeneration !== generationRef.current) return null;

      const entry = result
        ? buildMoveAnalysisEntry(result, { boardSize, matchType, movesSoFar })
        : null;
      storeEditableAnalysis(moveIndex, entry);
      return entry;
    } finally {
      inFlightCountRef.current--;
      if (inFlightCountRef.current <= 0) {
        inFlightCountRef.current = 0;
        setIsAnalyzing(false);
      }
    }
  };

  // 🐱 「今の世代」のうち、まだ実行されていない(キューに積まれてるだけの)
  //    解析依頼を全部取り消し、世代を1つ進める。分岐が起きた時・編集モードを
  //    抜けた時に呼ぶ。実行中の1件だけはキャンセルできないが、その結果は
  //    runAndStoreAnalysis内の世代チェックによってどのみち捨てられる。
  const cancelPendingAnalysis = () => {
    kataGoTask.cancelQueuedAnalysis(currentRequestId());
    generationRef.current++;
  };

  const reset = () => {
    setEditableAnalysis([]);
    cancelPendingAnalysis();
    setIsAnalyzing(false);
    inFlightCountRef.current = 0;
  };

  const truncateFrom = (fromIndex: number) => {
    setEditableAnalysis((prev) => prev.slice(0, fromIndex));
  };

  // 🐱 自動分析がoffの時に呼ぶ。KataGoを叩かず既定値(winRate:50, scoreLead:0)を書き込むだけ
  const storeDefaultEntry = (moveIndex: number) => {
    storeEditableAnalysis(moveIndex, EMPTY_ENTRY);
  };

  return {
    combinedAnalysis,
    isAnalyzing,
    runAndStoreAnalysis,
    truncateFrom,
    reset,
    cancelPendingAnalysis,
    storeDefaultEntry,
  };
};
