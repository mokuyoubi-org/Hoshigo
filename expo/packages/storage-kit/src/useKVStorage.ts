// useKVStorage.ts
// ====================================================================================
// 【ファイル全体の責務】
// 🍇kvStoreを辞書的なContextのように扱うための汎用フック。
// key単位でload→state化→変更のたびに自動保存、をここに閉じ込める。
// isLoadedフラグでチラつきを防ぐ。
// 同じkeyを複数コンポーネントが購読していても、setValueした瞬間に全員へ
// 通知することで、Reactの外にあるkvStoreを介した状態同期を実現する。
// ====================================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { kvStore } from "./kvStore/index";

// 🔔 key単位のリスナー管理。同じkeyを見てる全フックインスタンスに
//    「値が変わったよ」を知らせるための、モジュールスコープの購読テーブル。
const listeners = new Map<string, Set<(raw: string | null) => void>>();

function subscribe(key: string, listener: (raw: string | null) => void) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(listener);
  return () => {
    const set = listeners.get(key);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) {
      listeners.delete(key);
    }
  };
}

function notify(key: string, raw: string | null) {
  listeners.get(key)?.forEach((listener) => listener(raw));
}

/**
 * 🟩🟦使い方:
 * const { value, setValue, isLoaded } = useKVStorage("soundEnabled", true);
 * → 使う側はsave/loadを一切書かなくてよい。valueはプリミティブでもオブジェクトでもOK
 *   (内部でJSON.stringify/parseする)。
 *
 * const [boardSize, setBoardSize] = useState<BoardSize>(9);
 * を
 * const { value: boardSize, setValue: setBoardSize } = useKVStorage<BoardSize>("HomeScreen.boardSize", 9);
 * に変えるだけでいい。
 *
 * 🔔同じkeyを複数コンポーネントで使ってもOK。片方でsetValueすれば、
 *   もう片方も自動で最新値に更新される。
 */
export function useKVStorage<T>(key: string, defaultValue: T) {
  const [value, setValueState] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const defaultRef = useRef(defaultValue);
  // 📌 「いま最新の値」をReactの外で覚えておくメモ帳。
  //    更新関数の中で prev をもらう代わりに、ここから読むことで副作用を外に出せる
  const valueRef = useRef<T>(defaultValue);

  // ✏️ メモ帳とstateを、いつも一緒に更新するための共通処理
  const commit = useCallback((next: T) => {
    valueRef.current = next;
    setValueState(next);
  }, []);

  // 🛡️生rawから安全にTへ変換する共通処理(初回loadでも通知受信時でも使う)
  const applyRaw = useCallback(
    (raw: string | null) => {
      if (raw !== null) {
        try {
          commit(JSON.parse(raw) as T);
        } catch {
          // 🛡️壊れた/形式違いのデータが入っていた場合はデフォルトにフォールバック
          commit(defaultRef.current);
        }
      } else {
        commit(defaultRef.current);
      }
    },
    [commit],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);

    kvStore.getItem(key).then((raw) => {
      if (cancelled) return;
      applyRaw(raw);
      setIsLoaded(true);
    });

    // 🔔他のインスタンス(または自分自身)がsetValueしたら、rawを受け取って反映
    const unsubscribe = subscribe(key, (raw) => {
      if (cancelled) return;
      applyRaw(raw);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key, applyRaw]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      // 🧮 更新関数の「外」で新しい値を計算する(メモ帳の最新値を使う)
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(valueRef.current)
          : next;
      const raw = JSON.stringify(resolved);

      // 📝 まず自分の値を更新
      commit(resolved);
      // 💾 保存(失敗してもアプリが落ちないように握っておく)
      kvStore.setItem(key, raw).catch((e) => {
        console.warn(`useKVStorage: failed to save "${key}"`, e);
      });
      // 🔔自分以外の購読者にも変更を伝播(もう更新関数の外なので安全!)
      notify(key, raw);
    },
    [key, commit],
  );

  const removeValue = useCallback(() => {
    kvStore.removeItem(key).catch((e) => {
      console.warn(`useKVStorage: failed to remove "${key}"`, e);
    });
    // 🔔削除もnullとして通知(applyRawがdefaultValueにフォールバックしてくれる)
    notify(key, null);
    commit(defaultRef.current);
  }, [key, commit]);

  return { value, setValue, isLoaded, removeValue };
}
