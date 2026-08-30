// modelManager.ts

// eslint-disable-next-line no-restricted-imports
import B6_MODEL_ASSET from "../../assets/models/b6.bin.gz";
// eslint-disable-next-line no-restricted-imports
import B10_MODEL_ASSET from "../../assets/models/b10.bin.gz";
// eslint-disable-next-line no-restricted-imports
import B18_MODEL_ASSET from "../../assets/models/b18.bin.gz";
// @ts-ignore
import { Asset } from "expo-asset";

export type ModelId = "b6" | "b10" | "b18";
export const DEFAULT_MODEL_ID: ModelId = "b10";

const MODEL_ASSETS: Record<ModelId, number> = {
  b6: B6_MODEL_ASSET,
  b10: B10_MODEL_ASSET,
  b18: B18_MODEL_ASSET,
};

export async function readModelData(id: ModelId): Promise<Uint8Array> {
  const asset = Asset.fromModule(MODEL_ASSETS[id]);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error(`Asset の localUri 取得に失敗: ${id}`);
  }

  const response = await fetch(asset.localUri);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
