// cleanUp.ts
import { kvStore } from "kv-store";

export const clearAllLocalData = async (): Promise<void> => {
  try {
    // キーバリューの削除
    await kvStore.clear();
  } catch (error) {
    console.error("ストレージの消去に失敗した:", error);
  }
};
