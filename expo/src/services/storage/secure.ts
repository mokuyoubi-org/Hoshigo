// secure.ts
// 【ファイル全体の責務】
// 🔐「金庫」。認証トークンなど機密度の高い値だけを保存する。
// 使うのは基本的に supabaseClient.ts のみ。それ以外の用途は 🍇kvStore.ts を使うこと。

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// 🫐Web用の保存場所（localStorage）
const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    // 🛡️ガード
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    // 🛡️ガード
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

// 🍓Native用の保存場所（SecureStore）
const NativeStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// secure.ts に追加
export const clearStorage = async () => {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  } else {
    // SecureStore は特定のキーを消すか、Supabaseの signOut でトークンが消える！
  }
};

export const storage =
  Platform.OS === "web" ? WebStorageAdapter : NativeStorageAdapter;
