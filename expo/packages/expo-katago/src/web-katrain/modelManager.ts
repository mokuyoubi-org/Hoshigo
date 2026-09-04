// modelManager.ts

import { getModelFromIDB, saveModelToIDB } from "./modelStorage";

export type ModelId = "b6" | "b10" | "b18";
export const DEFAULT_MODEL_ID: ModelId = "b6";

const MODEL_URLS: Record<ModelId, string> = {
  b6: "https://pub-e440846f26924bb3a010471dc49d0d32.r2.dev/g170-b6c96-s175395328-d26788732.bin.gz",
  b10: "https://pub-e440846f26924bb3a010471dc49d0d32.r2.dev/g170e-b10c128-s1141046784-d204142634.bin.gz",
  b18: "https://pub-e440846f26924bb3a010471dc49d0d32.r2.dev/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz",
};

export type ModelDownloadProgress = {
  loaded: number;
  total: number; // content-lengthが取れない場合は0
};

export async function readModelData(
  id: ModelId,
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<Uint8Array> {
  console.log("[readModelData]環境: web");
  // 1. まずIndexedDBにあるか確認
  const cachedData = await getModelFromIDB(id);
  if (cachedData) {
    console.log(`⚡ [modelManager.web] IndexedDB から ${id} を読み込んだ`);
    return cachedData;
  }

  // 2. なければR2からダウンロード（ストリーミングで進捗を追いかける）
  const url = MODEL_URLS[id];
  if (!url) throw new Error(`未定義のModelId: ${id}`);

  console.log(`☁️ [modelManager.web] R2から ${id} のダウンロードを開始...`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(
      `[R2] モデルの取得に失敗した (${id}): ${response.statusText}`,
    );
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
  await saveModelToIDB(id, uint8Array);
  console.log(`💾 [modelManager.web] ${id} を IndexedDB に保存した！`);

  return uint8Array;
}
