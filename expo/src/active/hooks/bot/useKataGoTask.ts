// useKataGoTask.ts
//
// ─── このhookの責務 ───────────────────────────────────
// kataGo.run() を実際に呼び出す唯一の入口。
//
// 呼び出し側は「本当はこのモデルを使いたい」というmodelIdを1つ渡すだけで
// いい。そのモデルがまだウォームアップ中で今すぐ使えない場合、
// b18→b10→b6の順で、指定されたモデル以下の中から今すぐ使えるものに
// 自動的にフォールバックする(b10を要求したならb10かb6、b6を要求した
// ならb6しかあり得ない)。この判断はgetBestAvailableModelに委譲し、
// 呼び出し側は「フォールバックする」という事実自体を意識しなくていい。
// ──────────────────────────────────────────────────


import { Board, Grid, Color, BoardSize, MatchType } from "@/packages/go-core/src";
import { printCustomKataGoResult } from "@/src/stable/logics/debugLogics";
import { AnalyzeResult, ModelId, useKataGo } from "expo-katago";

export type KataGoTaskParams = {
  board: Board;
  movesSoFar: Grid[];
  currentPlayer: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  modelId: ModelId; // 「本当はこれを使いたい」という希望。自動でこれ以下にフォールバックする
};

// 希望モデルごとの、フォールバック先の優先順位(自分自身を含む、精度が高い順)。
// b18が欲しいなら b18→b10→b6、b10が欲しいなら b10→b6、b6が欲しいなら b6のみ。
const FALLBACK_CHAIN: Record<ModelId, ModelId[]> = {
  b18: ["b18", "b10", "b6"],
  b10: ["b10", "b6"],
  b6: ["b6"],
};

// ⚠️👍このuseKataGoTaskの存在意義はこのフィールドにあると言って良い。
const fields = {
  scoreSelfplay: false,
  scoreStdev: false,
  visits: false,
  ownershipStdev: false,
  policy: false,
  moveDetails: false,
};

export function useKataGoTask() {
  const kataGo = useKataGo();

  const run = async (
    params: KataGoTaskParams,
  ): Promise<AnalyzeResult | null> => {
    const resolvedModelId = kataGo.getBestAvailableModel(
      FALLBACK_CHAIN[params.modelId],
    );

    const result = await kataGo.run({
      ...params,
      modelId: resolvedModelId,
      fields,
    });

    console.log(
      `----------------------- ${resolvedModelId}の分析結果: -----------------------`,
    );
    printCustomKataGoResult(
      params.board,
      params.movesSoFar,
      params.currentPlayer,
      result,
      params.boardSize,
    );

    return result;
  };

  return {
    run,
    engineReady: kataGo.engineReady,
  };
}
