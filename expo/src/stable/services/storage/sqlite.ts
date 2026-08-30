// sqlite.ts
// ====================================================================================
// 【ファイル全体の責務】
// 🗄️「それ以外全部」の置き場。設定・UI状態などの辞書的な値から、将来的な構造化データ
// (records等)まで、secure.ts(金庫)ではない値はすべてここに寄せる。
// Native: expo-sqlite / Web: IndexedDB
//
// 普段のフィーチャー開発で「ローカルに保存したい」と思ったら、まずここを見る。
// ====================================================================================

// ====================================================================================
// 【ロジックパート・辞書API】
// ====================================================================================

import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

type KVAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

// 🟩🫐Web用の辞書実装（IndexedDBをKVっぽく使うための最小ラッパー）
const DB_NAME = "hoshigo-kv";
const STORE_NAME = "kv";

function openWebDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const WebKvAdapter: KVAdapter = {
  getItem: async (key) => {
    if (typeof indexedDB === "undefined") return null;
    const db = await openWebDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  setItem: async (key, value) => {
    if (typeof indexedDB === "undefined") return;
    const db = await openWebDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  removeItem: async (key) => {
    if (typeof indexedDB === "undefined") return;
    const db = await openWebDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

// 🟩🍓Native用の辞書実装（expo-sqlite/kv-store。中身はSQLiteだが見た目はAsyncStorage互換）
const NativeKvAdapter: KVAdapter = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: (key) => Storage.removeItem(key),
};

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

/**
 * 🟩🟦使い方:
 * sqliteKv.getItem(key) / setItem(key, value) / removeItem(key)
 * → 設定・フラグ・UI状態など「辞書的に取り出したい値」はすべてこれを使う。
 * 環境の違いは気にしなくていい。
 */
export const sqliteKv: KVAdapter =
  Platform.OS === "web" ? WebKvAdapter : NativeKvAdapter;

// ====================================================================================
// 【今後の拡張ポイント・DB API（未着手）】
// ====================================================================================
// records(対局履歴)のようにORDER BY/WHEREで絞り込みたいデータは、
// get/set形式ではなく用途ベースの関数(insert/getRecent/getByUid等)で生やす想定。
// Native: expo-sqliteの生SQL(db.getAllAsync等) / Web: IndexedDBのcursor・index検索
// 実装に着手するタイミングでこのファイル内、もしくは records.ts に分割して追加する。
