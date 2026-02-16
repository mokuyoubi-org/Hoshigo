// ストレージ関連
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