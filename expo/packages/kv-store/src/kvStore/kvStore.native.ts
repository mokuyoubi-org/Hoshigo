// kvStore/kvStore.native.ts
// 【責務】
// Native用の保存係。expo-sqlite/kv-store に保存する。
// メモリ上の辞書や通知は createKVStore が担当する。

import Storage from "expo-sqlite/kv-store";
import { createKVStore } from "./createKVStore";

console.log("🍓kvStore.native.ts");

export const kvStore = createKVStore({
  loadAll: async () => {
    const keys = await Storage.getAllKeys();
    const entries = await Promise.all(
      keys.map(async (key) => [key, await Storage.getItem(key)] as const),
    );
    return entries.filter(
      (entry): entry is [string, string] => entry[1] !== null,
    );
  },
  save: (key, value) => Storage.setItem(key, value),
  remove: (key) => Storage.removeItem(key),
  clear: () => Storage.clear(),
});
