// modelStorage.ts
// IndexedDBの読み書きを担当するファイル

const DB_NAME = "KatagoModelDB";
const STORE_NAME = "models";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getModelFromIDB(modelId: string): Promise<Uint8Array | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(modelId);
      req.onsuccess = () => {
        if (req.result) {
          resolve(new Uint8Array(req.result as ArrayBuffer));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[IndexedDB] 読み込み失敗:", e);
    return null;
  }
}

export async function saveModelToIDB(modelId: string, data: Uint8Array): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      // ArrayBufferに変換して保存する
      const req = store.put(data.buffer, modelId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[IndexedDB] 保存失敗:", e);
  }
}