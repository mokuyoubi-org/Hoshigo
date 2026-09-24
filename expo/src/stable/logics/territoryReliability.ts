// territoryReliability.ts
//
// 終局の地計算にキャッシュ済みanalysisを再利用して
// よいかどうかの判定。b6は精度が低すぎるため対象外とする。
// usePracticeSession/useMatchSession の両方で使う共通ロジック。

import { ModelId } from "expo-katago";

const RELIABLE_TERRITORY_MODEL_IDS: ModelId[] = ["b10", "b18"];

export function isReliableForTerritory(modelId: ModelId | undefined): boolean {
  return (
    modelId !== undefined && RELIABLE_TERRITORY_MODEL_IDS.includes(modelId)
  );
}