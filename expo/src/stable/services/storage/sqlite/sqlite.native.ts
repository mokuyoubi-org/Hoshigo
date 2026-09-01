// sqlite.native.ts
// ====================================================================================
// 【ファイル全体の責務】
// 🍓Native専用の辞書実装。ファイル名の .native.ts により、Web向けバンドルには
// このファイル自体が含まれない(=expo-sqliteがWebバンドルに混ざらない)。
// ====================================================================================

import Storage from "expo-sqlite/kv-store";

console.log("sqlite.native.ts");

type KVAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * 🟩🟦使い方:
 * sqliteKv.getItem(key) / setItem(key, value) / removeItem(key)
 * → 設定・フラグ・UI状態など「辞書的に取り出したい値」はすべてこれを使う。
 */
// sqlite.native.ts に追加
export const sqliteKv: KVAdapter & { clear: () => Promise<void> } = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: (key) => Storage.removeItem(key),
  clear: () => Storage.clear(),
};
