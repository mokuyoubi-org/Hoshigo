// kvStore/kvStore.web.ts
// 【責務】
// Web用の保存係。IndexedDBに保存する。
// メモリ上の辞書や通知は createKVStore が担当する。

import { createKVStore } from "./createKVStore";

console.log("🫐kvStore.web.ts");

const DB_NAME = "hoshigo-kv";
const STORE_NAME = "kv";

// 🚪 一度開いたDBの接続を使い回すためのメモ。
let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      const db = req.result;
      // 🛡️ブラウザ側に接続を閉じられたり、別タブがバージョンを上げたりしたら、
      //    メモを消して、次回は開き直せるようにする
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });

  return dbPromise;
};

// ✍️ 書き込み系(put / delete / clear)に共通の、トランザクションの後始末
const write = async (job: (store: IDBObjectStore) => void): Promise<void> => {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    job(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const kvStore = createKVStore({
  loadAll: async () => {
    if (typeof indexedDB === "undefined") return [];
    const db = await openDb();
    return new Promise<[string, string][]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      // 🔑 keyと値は同じ順番で返るので、並べて組にする
      const keysReq = store.getAllKeys();
      const valuesReq = store.getAll();
      tx.oncomplete = () => {
        const keys = keysReq.result as string[];
        const values = valuesReq.result as string[];
        resolve(keys.map((key, i) => [key, values[i]]));
      };
      tx.onerror = () => reject(tx.error);
    });
  },
  save: (key, value) => write((store) => void store.put(value, key)),
  remove: (key) => write((store) => void store.delete(key)),
  clear: () => write((store) => void store.clear()),
});
