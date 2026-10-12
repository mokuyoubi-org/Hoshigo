// packages/expo-katago/src/logics/modelManager.ts

import { KATAGO_MODEL } from "../constants/constants";
import { ModelDownloadProgress } from "../types/types";
import { getModelFromIDB, saveModelToIDB } from "./modelStorage";

const R2_KATAGO_MODELS_BASE_URL = "https://katagomodels.hoshigo.app";
const MODEL_URL = `${R2_KATAGO_MODELS_BASE_URL}/${KATAGO_MODEL}.bin.gz`;

export const readModelData = async (
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<Uint8Array> => {
  // 1. まずIndexedDBにあるか確認
  const cachedData = await getModelFromIDB();
  if (cachedData) {
    console.log(`⚡ [modelManager] IndexedDB から 読み込んだ`);
    return cachedData;
  }

  // 2. なければR2からダウンロード（ストリーミングで進捗を追いかける）
  const url = MODEL_URL;

  console.log(`☁️ [modelManager] R2からダウンロードを開始...`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`[R2] モデルの取得に失敗した`);
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ loaded, total });
  }

  const uint8Array = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    uint8Array.set(chunk, offset);
    offset += chunk.length;
  }

  // 3. 次回のためにIndexedDBに保存
  await saveModelToIDB(uint8Array);
  console.log(`💾 [modelManager] IndexedDB に保存した！`);

  return uint8Array;
};
