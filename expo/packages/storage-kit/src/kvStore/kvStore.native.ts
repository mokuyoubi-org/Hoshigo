// 🍓kvStore.native.ts
// ====================================================================================
// 【ファイル全体の責務】
// Native専用の辞書実装。expo-sqliteを使用。
// ====================================================================================

import Storage from "expo-sqlite/kv-store";

console.log("🍓kvStore.native.ts");

type KVAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * 🟩🟦使い方:
 * kvStore.getItem(key) / setItem(key, value) / removeItem(key)
 * → 設定・フラグ・UI状態など「辞書的に取り出したい値」はすべてこれを使う。
 */
export const kvStore: KVAdapter & { clear: () => Promise<void> } = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: (key) => Storage.removeItem(key),
  clear: () => Storage.clear(),
};
