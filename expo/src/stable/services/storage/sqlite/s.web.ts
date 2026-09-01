// sqlite.web.ts
// ====================================================================================
// 【ファイル全体の責務】
// 🫐Web専用の辞書実装。IndexedDBを使う。expo-sqliteはimportしないので、
// Metroのバンドル対象にも一切含まれない。
// ====================================================================================

type KVAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>; // これでええん？
};

const DB_NAME = "hoshigo-kv";
const STORE_NAME = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 🟩🟦使い方:
 * sqliteKv.getItem(key) / setItem(key, value) / removeItem(key)
 * → 設定・フラグ・UI状態など「辞書的に取り出したい値」はすべてこれを使う。
 */
export const sqliteKv: KVAdapter = {
  getItem: async (key) => {
    if (typeof indexedDB === "undefined") return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  setItem: async (key, value) => {
    if (typeof indexedDB === "undefined") return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  removeItem: async (key) => {
    if (typeof indexedDB === "undefined") return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // sqlite.web.ts に追加

  clear: async () => {
    if (typeof indexedDB === "undefined") return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
