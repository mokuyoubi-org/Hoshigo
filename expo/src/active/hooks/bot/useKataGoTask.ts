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

import { printCustomKataGoResult } from "@/src/stable/logics/debugLogics";
import { AnalyzeResult, ModelId, useKataGo } from "expo-katago";
import { Board, BoardSize, Color, Grid, MatchType } from "go-core";

export type KataGoTaskParams = {
  board: Board;
  movesSoFar: Grid[];
  currentPlayer: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  modelId: ModelId; // 「本当はこれを使いたい」という希望。自動でこれ以下にフォールバックする
  minModelId?: ModelId; // フォールバックを許容する下限モデル。省略時はb6まで許容(=最弱まで妥協可)
};

// モデルの優先順位(精度が高い順)。フォールバックチェーンはこの配列から動的に切り出す。
const MODEL_PRIORITY: ModelId[] = ["b18", "b10", "b6"];

// modelId(希望)からminModelId(下限)までの区間を切り出してフォールバックチェーンを作る。
// 例: getFallbackChain("b18", "b10") → ["b18", "b10"](b6には絶対に落ちない)
// 例: getFallbackChain("b18")        → ["b18", "b10", "b6"](従来通り、b6まで許容)
function getFallbackChain(
  modelId: ModelId,
  minModelId: ModelId = "b6",
): ModelId[] {
  const startIdx = MODEL_PRIORITY.indexOf(modelId);
  const endIdx = MODEL_PRIORITY.indexOf(minModelId);

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    // 不正な組み合わせ(下限が希望より高精度、等)は希望モデル単体にフォールバック
    return [modelId];
  }

  return MODEL_PRIORITY.slice(startIdx, endIdx + 1);
}

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
  ): Promise<(AnalyzeResult & { modelId: ModelId }) | null> => {
    const resolvedModelId = kataGo.getBestAvailableModel(
      getFallbackChain(params.modelId, params.minModelId),
    );

    const result = await kataGo.run({
      ...params,
      modelId: resolvedModelId,
      fields,
    });

    printCustomKataGoResult(
      resolvedModelId,
      params.board,
      params.movesSoFar,
      params.currentPlayer,
      result,
      params.boardSize,
    );

    return result ? { ...result, modelId: resolvedModelId } : null;
  };

  // 🌟フォールバックを一切許さない版。要求したmodelIdをそのまま使う。
  //   そのモデルがまだDL/ウォームアップ未完了でも、より弱いモデルに
  //   妥協することはない——kataGo.run→analyzeBoard内のloadModelが
  //   キャッシュに無ければその場でDL・ウォームアップを待ってから
  //   解析するので、単に時間がかかるだけで結果は必ず要求モデル基準になる。
  //   終局の地計算のように「精度が絶対、待ち時間は許容できる」用途専用。
  //   requestIdを渡すと、まだキューに積まれてる間だけcancelQueuedAnalysis
  //   で取り消せるようになる(連打で不要になった編集モードの解析の後始末用)。
  const runExact = async (
    params: KataGoTaskParams,
    requestId?: string,
  ): Promise<(AnalyzeResult & { modelId: ModelId }) | null> => {
    const result = await kataGo.run({ ...params, fields }, requestId);

    printCustomKataGoResult(
      params.modelId,
      params.board,
      params.movesSoFar,
      params.currentPlayer,
      result,
      params.boardSize,
    );

    return result ? { ...result, modelId: params.modelId } : null;
  };

  return {
    run,
    runExact,
    engineReady: kataGo.engineReady,
    cancelQueuedAnalysis: kataGo.cancelQueuedAnalysis,
  };
}