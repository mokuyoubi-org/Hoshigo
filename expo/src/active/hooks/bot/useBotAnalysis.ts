// useBotAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 1局分のRecordTypeを受け取り、手ごとのKataGo解析(b6)を進める・止める・
// DBに永続化する、をまとめて面倒みるAnalyzeScreen専属のorchestratorフック。
// (呼び出し箇所がAnalyzeScreen1箇所だけなので、Context直結のuseKataGoTaskを
//  ここで直接呼ぶのは、まとめ役/道具のルールに沿って問題ない)
//
// 中断の挙動: 実行中の1手ぶんの推論そのものは止めない。
// 「次の手への予約」だけキャンセルする(ループの先頭でstopRequestedRefを見る)。
//
// 2026/09/07: perMove[i]は「i手目を打つ前の局面」の解析結果なので、
// 最後の1手の効果を測るには「全手打ち終わった後の最終局面」もperMove
// [totalMoves]として持っておく必要がある。手ごとのループが全部終わった
// 後、追加で1回だけ最終局面を解析してこれを埋める。
// ──────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

import {
  buildMoveAnalysisEntry,
  createEmptyAnalysis,
  getAnalyzedCount,
} from "@/src/stable/logics/analysis";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import {
  BLACK,
  isNoOkiishi,
  movesToBoardHistory,
  RecordAnalysis,
  WHITE,
} from "go-core";
import { RecordType } from "../../types/record";
import { useKataGoTask } from "./useKataGoTask";

const ANALYSIS_MODEL_ID = "b6";

export function useBotAnalysis(record: RecordType) {
  const kataGoTask = useKataGoTask();
  const totalMoves = record.moves?.length ?? 0;
  const isNormalOrder = isNoOkiishi(record.match_type);

  // 手ごとに再計算しなくて済むよう、盤面履歴は1回だけ組み立てる
  const boardHistoryRef = useRef(
    movesToBoardHistory(
      record.board_size,
      record.match_type,
      record.moves ?? [],
    ).boardHistory,
  );

  const [analysis, setAnalysis] = useState<RecordAnalysis>(
    () => record.analysis ?? createEmptyAnalysis(totalMoves),
  );
  const analysisRef = useRef(analysis);
  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const runningRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const analyzedCount = getAnalyzedCount(analysis, totalMoves);

  // moveIndex(0-indexed、その手が打たれた直後の局面)を1手分析してエントリを返す
  const analyzeOneMove = async (moveIndex: number) => {
    // 1. その手を打つ【前】の盤面を取得する（+1 をやめる）
    const board = boardHistoryRef.current[moveIndex];

    // 2. その手を打つ【前】までの履歴を取得する（sliceの範囲を変更）
    const movesSoFar = (record.moves ?? []).slice(0, moveIndex);

    // 3. これから打つ人の色（その手を打った本人の色）を計算する！
    // 0手目(1手目)が黒なら、even(0, 2, 4...)はBLACK
    const isBlackTurn = isNormalOrder
      ? moveIndex % 2 === 0
      : moveIndex % 2 === 1;
    const currentPlayer = isBlackTurn ? BLACK : WHITE;

    const result = await kataGoTask.run({
      board,
      movesSoFar,
      currentPlayer,
      boardSize: record.board_size,
      matchType: record.match_type,
      modelId: ANALYSIS_MODEL_ID,
    });

    if (!result) return null;
    return buildMoveAnalysisEntry(result);
  };

  // 全手打ち終わった後の最終局面を分析してエントリを返す。
  // (analyzeOneMoveと構造は同じだが、moveIndex=totalMovesとして
  //  「最後の手を打った後」を評価する点だけが違う)
  const analyzeFinalPosition = async () => {
    const board = boardHistoryRef.current[totalMoves];
    const movesSoFar = record.moves ?? [];

    const isBlackTurn = isNormalOrder
      ? totalMoves % 2 === 0
      : totalMoves % 2 === 1;
    const currentPlayer = isBlackTurn ? BLACK : WHITE;

    const result = await kataGoTask.run({
      board,
      movesSoFar,
      currentPlayer,
      boardSize: record.board_size,
      matchType: record.match_type,
      modelId: ANALYSIS_MODEL_ID,
    });

    if (!result) return null;
    return buildMoveAnalysisEntry(result);
  };

  const startLoop = async () => {
    if (runningRef.current || totalMoves === 0) return;
    runningRef.current = true;
    stopRequestedRef.current = false;
    setIsAnalyzing(true);

    try {
      let current = analysisRef.current;
      let completedAllMoves = true;

      for (let i = getAnalyzedCount(current, totalMoves); i < totalMoves; i++) {
        if (stopRequestedRef.current) {
          completedAllMoves = false;
          break;
        }

        const entry = await analyzeOneMove(i);
        if (!entry) {
          console.warn(
            `[useRecordAnalysis] ${i}手目の解析に失敗したため中断します`,
          );
          completedAllMoves = false;
          break;
        }

        current = {
          perMove: current.perMove.map((v, idx) => (idx === i ? entry : v)),
        };
        analysisRef.current = current;
        setAnalysis(current);

        try {
          await recordsRepo.updateAnalysis(
            record.board_size,
            record.id,
            current,
          );
        } catch (e) {
          // 🐱 DB保存に失敗した場合、原因究明のため必ずログに残す
          console.error(
            `[useRecordAnalysis] ${i}手目のDB保存に失敗しました`,
            e,
          );
          completedAllMoves = false;
          break;
        }
      }

      // 🐱 手ごとのループが最後まで完走した(中断も失敗もなかった)場合だけ、
      //    最終局面(最後の1手の効果を測るためのperMove[totalMoves])を埋める。
      //    既に埋まっていれば(前回のセッションで完了済みなら)スキップ。
      if (completedAllMoves && current.perMove[totalMoves] == null) {
        const finalEntry = await analyzeFinalPosition();
        if (finalEntry) {
          current = {
            perMove: [...current.perMove.slice(0, totalMoves), finalEntry],
          };
          analysisRef.current = current;
          setAnalysis(current);
          await recordsRepo.updateAnalysis(
            record.board_size,
            record.id,
            current,
          );
        } else {
          console.warn("[useRecordAnalysis] 最終局面の解析に失敗しました");
        }
      }
    } finally {
      runningRef.current = false;
      setIsAnalyzing(false);
    }
  };

  // 解析中なら「次の手への予約」を取り消すだけ。実行中の1手は最後まで待つ。
  const requestStop = () => {
    stopRequestedRef.current = true;
  };

  const toggleAnalysis = () => {
    if (isAnalyzing) {
      requestStop();
    } else {
      startLoop();
    }
  };

  return {
    analysis,
    analyzedCount,
    totalMoves,
    isAnalyzing,
    toggleAnalysis,
    requestStop,
    engineReady: kataGoTask.engineReady,
  };
}
