// useKVStorage.ts
// 【責務】
// kvStoreの1つのkeyをReactのstateのように扱うフック。
// kvStoreはメモリ上から同期で読めるので、loadingは不要。
// 同じkeyを複数コンポーネントが購読していても、set した瞬間に全員へ反映される。

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { kvStore } from "./kvStore/index";

// 🛡️ 生の文字列から安全にTへ変換する(壊れたデータ・無い場合はデフォルト)
const parse = <T>(raw: string | null, fallback: T): T => {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const useKVStorage = <T>(key: string, defaultValue: T) => {
  // 📌 最初に渡されたデフォルト値を覚えておく。
  //    毎回新しい配列やオブジェクトが渡されても、ここは変わらない(useStateの初期値は最初の1回だけ使われる)
  const [fallback] = useState(defaultValue);

  // 🔔 kvStoreの変更を購読(keyが変わった時だけ購読し直す)
  const subscribe = useCallback(
    (listener: () => void) => kvStore.subscribe(key, listener),
    [key],
  );
  const raw = useSyncExternalStore(subscribe, () => kvStore.get(key));

  const value = useMemo(() => parse(raw, fallback), [raw, fallback]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      // 🧮 更新関数には、その時点の最新値を渡す
      const prev = parse(kvStore.get(key), fallback);
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      kvStore.set(key, JSON.stringify(resolved));
    },
    [key, fallback],
  );

  const removeValue = useCallback(() => {
    kvStore.remove(key);
  }, [key]);

  return { value, setValue, removeValue };
};
