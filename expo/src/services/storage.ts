// storage.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
// Web用の保存場所（localStorage）
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

// Native用の保存場所（SecureStore）
const NativeStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const storage =
  Platform.OS === "web" ? WebStorageAdapter : NativeStorageAdapter;

// テーマ関連
const THEME_KEY = "theme";

export const themeStore = {
  get: () => storage.getItem(THEME_KEY),
  set: (theme: "light" | "dark" |"standard") => storage.setItem(THEME_KEY, theme),
  remove: () => storage.removeItem(THEME_KEY),
};

// 言語関連
const LANG_KEY = "userLang";

export const langStore = {
  get: () => storage.getItem(LANG_KEY),
  set: (lang: string) => storage.setItem(LANG_KEY, lang),
  remove: () => storage.removeItem(LANG_KEY),
};


// SecureStoreは"全削除"APIがないので、既知のキーを列挙して消す
const SUPABASE_STORAGE_KEY = "supabase.auth.token"; // Supabaseが使うキー

export const clearAllStorage = async () => {
  if (Platform.OS === "web") {
    localStorage.clear();
  } else {
    // 消したいキーを全て列挙する
    const keys = [
      SUPABASE_STORAGE_KEY,
      THEME_KEY,
      LANG_KEY,
      // 他に SecureStore に保存しているキーがあれば追加
    ];
    await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  }
};