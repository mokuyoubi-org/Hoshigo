// packages/expo-katago/src/logics/modelStorage.ts
// IndexedDBの読み書きを担当するファイル

import { KATAGO_MODEL } from "../constants/constants";

// ⚠️ DB_NAMEとSTORE_NAMEを変えると、既存ユーザーが保存済みのモデルを
//    読めなくなり、全員がもう一度ダウンロードすることになる。
const DB_NAME = "KatagoModelDB";
const STORE_NAME = "models";

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
// ⚠️ モデルをIndexedDBに保存するときの名前。
export const getModelFromIDB = async (): Promise<Uint8Array | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KATAGO_MODEL);
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
};

// 🙏 「このデータは追い出さないで」のお願いを、アプリ起動中に1回だけ出すための札
let persistRequested = false;

// 🛡️ ブラウザに「容量が足りなくなっても、ここのデータは消さないで」とお願いする。
//    通るかどうかはブラウザしだいで、通らなくても困らない(消えたら入れ直すだけ)。
//    navigator.storage が無い環境でも落ちないようにしてある。
const requestPersistentStorage = (): void => {
  if (persistRequested) return;
  persistRequested = true;

  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) {
      return;
    }
    navigator.storage
      .persist()
      .then((granted) => {
        console.log("[IndexedDB] persist お願いの結果:", granted);
      })
      .catch((e) => {
        console.warn("[IndexedDB] persist お願い失敗:", e);
      });
  } catch (e) {
    console.warn("[IndexedDB] persist お願い失敗:", e);
  }
};

export const saveModelToIDB = async (data: Uint8Array): Promise<void> => {
  // 🙏 保存の前に、追い出さないでね、とお願いしておく(待たない)
  requestPersistentStorage();

  try {
    const db = await openDB();
    // ⚠️ return await にしているのが大事。
    //    awaitが無いと、保存の失敗がこのcatchに届かず、そのまま呼び出し元に
    //    投げられてしまう(=ダウンロードは成功したのにエラー画面になる)。
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      // ArrayBufferに変換して保存する。第2引数が保存名(キー)なので、必ず渡す。
      const req = store.put(data.buffer, KATAGO_MODEL);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[IndexedDB] 保存失敗:", e);
  }
};
