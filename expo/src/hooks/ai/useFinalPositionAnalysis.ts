// useFinalPositionAnalysis.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 終局した局面の分析結果(ownership / scoreLead)を用意する専用hook。
// 地や死に石の判断は、保存時に仕上げ(settleAnalysis)がやるので、ここでは
// 「その局面を、必要なモデルで分析した結果」を返すだけ。
//
// 2つのモード(strict)がある。
//  - strict: true (既定。オンライン対局用)
//    (useKataGoTaskのrunExactを使う)。要求モデルがまだDL/ウォームアップ未完了
//    でも、その完了を待ってから解析する。
//  - strict: false (練習対局用)
//    勝敗に影響しないので、精度より「待たないこと」を優先する。要求モデルが
//    まだ使えなければ、使えるモデルにフォールバックする(useKataGoTaskのrun)。
//    使い回し候補のモデルも、どのモデルでも受け入れる。
//
// 2026/09/07: 終局の分析は、最終局面のwinRate/scoreLeadも一緒に持っている。
// 呼び出し元(useMatchSession)がliveAnalysisに記録できるよう、analysisごと返す。
//
// ──────────────────────────────────────────────────


import { Board, BoardSize, Grid, MatchType } from "go-core";
import { useKataGoTask } from "./useKataGoTask";
import { AnalyzeResult } from "@/packages/expo-katago/src";

type UseFinalPositionAnalysisOptions = {
  strict?: boolean;
};

export const useFinalPositionAnalysis = ({
  strict = true,
}: UseFinalPositionAnalysisOptions = {}) => {
  const kataGoTask = useKataGoTask();

  const analyzeFinalPosition = async (
    board: Board,
    movesSoFar: Grid[],
    matchType: MatchType,
    boardSize: BoardSize,
    // 🌟呼び出し元がすでに「この局面」の解析結果を持っている場合はそれを渡してもらう。
    //   要求モデル以上の精度なら、KataGoを再度呼ばず、そのまま使い回す。
    //   未指定(undefined)の場合、解析に失敗していた場合(null)、モデルIDが
    //   不明または要求に満たない場合は、この場で新規に解析する。
    precomputedAnalysis?: AnalyzeResult | null,
  ): Promise<AnalyzeResult | null> => {


    const params = {
      board,
      movesSoFar,
      matchType,
      boardSize,
    };

    // strict: フォールバック無し(runExact)。未準備でも待ってから解析する。
    // 非strict: 使えるモデルにフォールバックしてよい(run)。
    return strict ? kataGoTask.runExact(params) : kataGoTask.run(params);
  };

  return { analyzeFinalPosition };
};