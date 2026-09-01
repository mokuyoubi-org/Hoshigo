// useBotAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 1局分のRecordTypeを受け取り、手ごとのKataGo解析(b6)を進める・止める・
// DBに永続化する、をまとめて面倒みるAnalyzeScreen専属のorchestratorフック。
// (呼び出し箇所がAnalyzeScreen1箇所だけなので、Context直結のuseKataGoを
//  ここで直接呼ぶのは、まとめ役/道具のルールに沿って問題ない)
//
// 中断の挙動: 実行中の1手ぶんの推論そのものは止めない。
// 「次の手への予約」だけキャンセルする(ループの先頭でstopRequestedRefを見る)。
// ──────────────────────────────────────────────────

import { BLACK, isNoOkiishi, movesToBoardHistory, WHITE } from "expo-goband";
import { useKataGo } from "expo-katago";
import { useEffect, useRef, useState } from "react";

import {
  buildMoveAnalysisEntry,
  createEmptyAnalysis,
  getAnalyzedCount,
} from "@/src/stable/logics/analysis";
import { printCustomKataGoResult } from "@/src/stable/logics/debugLogics";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import { RecordAnalysis } from "../../types/analysis";
import { RecordType } from "../../types/record";

const ANALYSIS_MODEL_ID = "b6";

export function useBotAnalysis(record: RecordType) {
  const kataGo = useKataGo();
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

    const result = await kataGo.run({
      board,
      movesSoFar,
      currentPlayer,
      boardSize: record.board_size,
      matchType: record.match_type,
      modelId: ANALYSIS_MODEL_ID,
    });

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    printCustomKataGoResult(board, movesSoFar, currentPlayer, result);

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

    // ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️

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
      for (let i = getAnalyzedCount(current, totalMoves); i < totalMoves; i++) {
        if (stopRequestedRef.current) break;

        const entry = await analyzeOneMove(i);
        if (!entry) {
          console.warn(
            `[useRecordAnalysis] ${i}手目の解析に失敗したため中断します`,
          );
          break;
        }

        current = {
          perMove: current.perMove.map((v, idx) => (idx === i ? entry : v)),
        };
        analysisRef.current = current;
        setAnalysis(current);

        await recordsRepo.updateAnalysis(record.board_size, record.id, current); // db保存
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
    engineReady: kataGo.engineReady,
  };
}
