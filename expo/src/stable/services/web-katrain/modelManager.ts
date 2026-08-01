// modelManager.ts
// @ts-ignore
import B10_MODEL_ASSET from "@/assets/models/b10.bin.gz";
import { Asset } from "expo-asset";

export const DEFAULT_MODEL_ID = "b10" as const;
export type ModelId = typeof DEFAULT_MODEL_ID;

/**
 * assets から直接モデルバイナリを読み込む関数
 */
export async function readModelData(id: ModelId): Promise<Uint8Array> {
  // 現状 b10 のみバンドルされている前提
  const asset = Asset.fromModule(B10_MODEL_ASSET);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error("Asset の localUri 取得に失敗");
  }

  const response = await fetch(asset.localUri);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
