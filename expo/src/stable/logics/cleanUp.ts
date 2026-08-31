// cleanUp.ts

import { clearStorage } from "../services/storage/secure";
import { sqliteKv } from "../services/storage/sqlite";
import { recordsRepo } from "./records-repo";

export async function clearAllLocalData(): Promise<void> {
  try {
    // 1. 設定・キーバリューの削除
    await sqliteKv.clear();
    // 2. 棋譜データベースの削除
    await recordsRepo.clearAll();
    // 3. 金庫・localStorageの削除
    await clearStorage();
  } catch (error) {
    console.error("ストレージの消去に失敗した:", error);
  }
}
