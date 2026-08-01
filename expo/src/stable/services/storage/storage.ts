// ====================================================================================
// 【ファイル全体の責務】
// 🫐Webでも🍓Nativeでも、どちらの環境でも同じように使える「データ保存用ボックス（storage）」を提供する。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// 🟩🫐Web用の保存場所（localStorage）
const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

// 🟩🍓Native用の保存場所（SecureStore）
const NativeStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

/**
 * 🟩🟦使い方:
 * storageは、関数を集めたオブジェクト。
 * storage.getItem(key)で取り出し、deleteItem(key)で削除し、setItem(key, value)でセットする。
 * 環境の違いは気にしなくていい。
 */
export const storage =
  Platform.OS === "web" ? WebStorageAdapter : NativeStorageAdapter;
