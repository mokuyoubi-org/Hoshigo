// records-repo.web.ts

import type { RecordType } from "@/src/active/types/record";
import type { RecordAnalysis } from "@/src/active/types/analysis";

export type RecordsRepo = {
  insertMany: (records: RecordType[]) => Promise<void>;
  getNewestId: (boardSize: number) => Promise<number | null>;
  getOldestId: (boardSize: number) => Promise<number | null>;
  getPage: (
    boardSize: number,
    beforeId: number | null,
    limit: number,
  ) => Promise<RecordType[]>;
  updateAnalysis: (
    boardSize: number,
    id: number,
    analysis: RecordAnalysis | null,
  ) => Promise<void>; // 🆕追加
  clearAll: () => Promise<void>; // 🆕追加
};

const DB_NAME = "hoshigo-records";
const STORE_NAME = "records";
const INDEX_NAME = "by_board_size_id";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });
      store.createIndex(INDEX_NAME, ["board_size", "id"]);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const recordsRepo: RecordsRepo = {
  insertMany: async (records) => {
    // (変更なし。IndexedDBはスキーマレスなのでanalysisフィールドが無くても問題なし)
    if (typeof indexedDB === "undefined" || records.length === 0) return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const r of records) store.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  getNewestId: async (boardSize) => {
    // (変更なし)
    if (typeof indexedDB === "undefined") return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index(INDEX_NAME);
      const range = IDBKeyRange.bound(
        [boardSize, -Infinity],
        [boardSize, Infinity],
      );
      const req = index.openCursor(range, "prev");
      req.onsuccess = () => resolve(req.result ? req.result.value.id : null);
      req.onerror = () => reject(req.error);
    });
  },

  getOldestId: async (boardSize) => {
    // (変更なし)
    if (typeof indexedDB === "undefined") return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index(INDEX_NAME);
      const range = IDBKeyRange.bound(
        [boardSize, -Infinity],
        [boardSize, Infinity],
      );
      const req = index.openCursor(range, "next");
      req.onsuccess = () => resolve(req.result ? req.result.value.id : null);
      req.onerror = () => reject(req.error);
    });
  },

  getPage: async (boardSize, beforeId, limit) => {
    if (typeof indexedDB === "undefined") return [];
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index(INDEX_NAME);
      const upper = beforeId == null ? Infinity : beforeId;
      const range = IDBKeyRange.bound(
        [boardSize, -Infinity],
        [boardSize, upper],
        false,
        beforeId != null,
      );
      const results: RecordType[] = [];
      const req = index.openCursor(range, "prev");
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor || results.length >= limit) {
          // 🆕nativeとの型整合のため、analysisが無いレコードはnullに正規化
          resolve(
            results.map((r) => ({ ...r, analysis: r.analysis ?? null })),
          );
          return;
        }
        results.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  },

  // 🆕1手分析されるごとにここが呼ばれる想定。get→フィールド更新→put。
  updateAnalysis: async (boardSize, id, analysis) => {
    if (typeof indexedDB === "undefined") return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          resolve();
          return;
        }
        store.put({ ...existing, analysis });
      };
      getReq.onerror = () => reject(getReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },


  clearAll: async () => {
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