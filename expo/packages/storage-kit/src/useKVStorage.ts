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

  // 🛡️生rawから安全にTへ変換する共通処理(初回loadでも通知受信時でも使う)
  const applyRaw = useCallback((raw: string | null) => {
    if (raw !== null) {
      try {
        setValueState(JSON.parse(raw) as T);
      } catch {
        // 🛡️壊れた/形式違いのデータが入っていた場合はデフォルトにフォールバック
        setValueState(defaultRef.current);
      }
    } else {
      setValueState(defaultRef.current);
    }
  }, []);

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
      setValueState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        const raw = JSON.stringify(resolved);
        kvStore.setItem(key, raw);
        // 🔔自分以外の購読者にも変更を伝播
        notify(key, raw);
        return resolved;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    kvStore.removeItem(key);
    // 🔔削除もnullとして通知(applyRawがdefaultValueにフォールバックしてくれる)
    notify(key, null);
    setValueState(defaultRef.current);
  }, [key]);

  return { value, setValue, isLoaded, removeValue };
}
