// useRecordAnalysisLoop.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 1局分のRecordTypeを受け取り、手ごとのKataGo解析(ANALYSIS_MODEL_ID)を
// 進める・止める・DBに永続化する、をまとめて面倒みる棋譜分析ループ専属の
// orchestratorフック。useKataGoTaskを呼んでよい「道具hook」の1つ。
//
// 中断の挙動: 実行中の1手ぶんの推論そのものは止めない。
// 「次の手への予約」だけキャンセルする(ループの先頭でstopRequestedRefを見る)。
//
// 2026/09/07: pos[i]は「i手目を打つ前の局面」の解析結果なので、
// 最後の1手の効果を測るには「全手打ち終わった後の最終局面」もperMove
// [totalMoves]として持っておく必要がある。手ごとのループが全部終わった
// 後、追加で1回だけ最終局面を解析してこれを埋める。
// ──────────────────────────────────────────────────

import {
  buildMoveAnalysisEntry,
  createEmptyAnalysis,
  getAnalyzedCount,
} from "@/src/logics/game/analysis";
import { RecordType } from "@/src/types/record";
import { movesToBoardHistory, RecordAnalysis } from "go-core";
import { useEffect, useRef, useState } from "react";
import { useKataGoTask } from "./useKataGoTask";

export const useRecordAnalysisLoop = (record: RecordType) => {
  const kataGoTask = useKataGoTask();
  const totalMoves = record.moves?.length ?? 0;

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

  // moveIndex手分が打たれた局面(=moveIndex番目の手を打つ前の局面)を分析して
  // エントリを返す。moveIndex = totalMoves なら、全手打ち終わった後の最終局面。
  const analyzeOneMove = async (moveIndex: number) => {
    const board = boardHistoryRef.current[moveIndex];
    const movesSoFar = (record.moves ?? []).slice(0, moveIndex);

    const result = await kataGoTask.run(
      board,
      movesSoFar,
      record.board_size,
      record.match_type,
    );

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

      // 🌟 先頭から1手ずつ見て、分析済みの手は飛ばす。
      //   (練習の途中再開などで、前のほうや途中に穴が空いていても、
      //    空いている手だけを分析する)
      for (let i = 0; i < totalMoves; i++) {
        if (current.pos[i] != null) continue;

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

        // 🌟 配列が短い時(後ろが未記録の時)でも、i番目に入れられるようにそろえる。
        //   (mapだけだと、配列の長さより後ろの手は入らずに消えてしまう)
        const pos = [...current.pos];
        while (pos.length <= i) pos.push(null);
        pos[i] = entry;
        current = { pos };
        analysisRef.current = current;
        setAnalysis(current);
      }

      // 🐱 手ごとのループが最後まで完走した(中断も失敗もなかった)場合だけ、
      //    最終局面(最後の1手の効果を測るためのperMove[totalMoves])を埋める。
      //    既に埋まっていれば(前回のセッションで完了済みなら)スキップ。
      if (completedAllMoves && current.pos[totalMoves] == null) {
        const finalEntry = await analyzeOneMove(totalMoves);
        if (finalEntry) {
          current = {
            pos: [...current.pos.slice(0, totalMoves), finalEntry],
          };
          analysisRef.current = current;
          setAnalysis(current);
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
};
