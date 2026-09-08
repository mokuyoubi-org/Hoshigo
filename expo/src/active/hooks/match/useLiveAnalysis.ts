// useLiveAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中、画面には一切出さずに、手ごとのKataGo解析結果を裏側で溜めて
// おくだけの薄い保管庫。黒番・白番どちらの手でも、その手が打たれた
// 直後の局面のAnalyzeResultを受け取って記録するだけ。
//
// 対局終了時、溜まった内容をRecordAnalysis形式(useBotAnalysisの事後分析
// と同じ入れ物)にして返す。MoveEditScreenに渡すのはこの形。
// ──────────────────────────────────────────────────

import { buildMoveAnalysisEntry } from "@/src/stable/logics/analysis";
import {
  MoveAnalysisEntry,
  RecordAnalysis,
} from "expo-goband";
import { AnalyzeResult } from "expo-katago";
import { useRef } from "react";

export function useLiveAnalysis() {
  const perMoveRef = useRef<(MoveAnalysisEntry | null)[]>([]);

  // moveIndex(0-indexed、その手が打たれた直後の局面)にAnalyzeResultを記録する。
  // 同じmoveIndexに対して2回呼ばれた場合は、後から呼ばれた方で上書きされる
  // (再送信でやり直した場合の後始末を兼ねる)。
  // resultがnull(二重パス等で分析が取れなかった)の場合は何もしない。
  const record = (moveIndex: number, result: AnalyzeResult | null) => {
    if (!result) return;
    const entry = buildMoveAnalysisEntry(result);
    const arr = perMoveRef.current;
    while (arr.length <= moveIndex) arr.push(null);
    arr[moveIndex] = entry;
  };

  // サーバーとのresync等でmoves配列自体が短縮された場合に、それより後ろの
  // ゴミを掃除する。
  const truncate = (length: number) => {
    perMoveRef.current = perMoveRef.current.slice(0, length);
  };

  const getRecordAnalysis = (): RecordAnalysis => ({
    perMove: [...perMoveRef.current],
  });

  return { record, truncate, getRecordAnalysis };
}
