// modelStatus.ts
// 各ModelIdの「今どういう状態か」をUIが扱いやすい4状態にまとめる。
// KataGoEngineContextの生の状態(readyModelIds/loadProgress/downloadedModelIds)から
// 計算するだけの純粋関数(Reactに依存しない)。
//
// ユーザーへの見せ方の指針:
//   not_downloaded → 「ダウンロードが必要です」+ ダウンロードボタン
//   downloading    → 「ダウンロード中… n%」
//   warming_up     → 「準備中…もうしばらくお待ちください」
//   ready          → チェックマーク等、選択・対局可能の印

import { ModelLoadStage } from "./analyzeBoard";
import { ModelId } from "./modelManager";

export type LoadProgressState = {
  modelId: ModelId;
  stage: ModelLoadStage;
} | null;

export type ModelStatus =
  | { phase: "not_downloaded" }
  | { phase: "downloading"; loaded: number; total: number }
  | { phase: "warming_up" }
  | { phase: "ready" };

export function getModelStatus(
  id: ModelId,
  readyModelIds: ReadonlySet<ModelId>,
  loadProgress: LoadProgressState,
  // 「DLは既に済んでいると判明しているが、まだウォームアップの自分の番が
  // 回ってきていない(loadProgressにまだ現れていない)」モデルの集合。
  // これが無いと、その空白時間だけ not_downloaded に誤診断されてしまう。
  downloadedModelIds: ReadonlySet<ModelId>,
): ModelStatus {
  if (readyModelIds.has(id)) return { phase: "ready" };

  if (loadProgress?.modelId === id) {
    if (loadProgress.stage.phase === "downloading") {
      return {
        phase: "downloading",
        loaded: loadProgress.stage.loaded,
        total: loadProgress.stage.total,
      };
    }
    return { phase: "warming_up" };
  }

  if (downloadedModelIds.has(id)) return { phase: "warming_up" };

  return { phase: "not_downloaded" };
}