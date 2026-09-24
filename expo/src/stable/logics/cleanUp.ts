// cleanUp.ts
import { kvStore } from "storage-kit";
import { recordsRepo } from "./records-repo";

export async function clearAllLocalData(): Promise<void> {
  try {
    // 1. 設定・キーバリューの削除
    await kvStore.clear();
    // 2. 棋譜データベースの削除
    await recordsRepo.clearAll();
  } catch (error) {
    console.error("ストレージの消去に失敗した:", error);
  }
}
