// modelManager.ts

import { getModelFromIDB, saveModelToIDB } from "./modelStorage";

export type ModelId = "b6" | "b10" | "b18";
export const DEFAULT_MODEL_ID: ModelId = "b10";

// 社長のR2のURLだにゃ！♪
const MODEL_URLS: Record<ModelId, string> = {
  b6: "https://pub-e440846f26924bb3a010471dc49d0d32.r2.dev/g170-b6c96-s175395328-d26788732.bin.gz",
  b10: "https://pub-e440846f26924bb3a010471dc49d0d32.r2.dev/g170e-b10c128-s1141046784-d204142634.bin.gz",
  b18: "https://pub-e440846f26924bb3a010471dc49d0d32.r2.dev/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz",
};

export async function readModelData(id: ModelId): Promise<Uint8Array> {
  // 1. まずIndexedDBにあるか確認する
  const cachedData = await getModelFromIDB(id);
  if (cachedData) {
    console.log(`⚡ [modelManager] IndexedDB から ${id} を読み込んだにゃ！`);
    return cachedData;
  }

  // 2. なければR2からダウンロードするにゃ
  const url = MODEL_URLS[id];
  if (!url) {
    throw new Error(`未定義のModelIdだにゃ: ${id}`);
  }

  console.log(`☁️ [modelManager] R2から ${id} のダウンロードを開始するにゃ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[R2] モデルの取得に失敗したにゃ (${id}): ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // 3. 次回のためにIndexedDBに保存するにゃ！
  await saveModelToIDB(id, uint8Array);
  console.log(`💾 [modelManager] ${id} を IndexedDB に保存したにゃ！`);

  return uint8Array;
}