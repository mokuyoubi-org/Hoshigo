// cleanUp.ts
import { kvStore } from "storage-kit";
import { recordsRepo } from "./records-repo";
import { clearPeriodicCache } from "./syncUtils";

export async function clearAllLocalData(): Promise<void> {
  try {
    // 0. 24時間取っておくやつも消しとく
    clearPeriodicCache("global_rankings");
    // 1. 設定・キーバリューの削除
    await kvStore.clear();
    // 2. 棋譜データベースの削除
    await recordsRepo.clearAll();
  } catch (error) {
    console.error("ストレージの消去に失敗した:", error);
  }
}
