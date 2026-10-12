// kvStore/createKVStore.ts
// 【責務】
// 「メモリ上の辞書 + 変更通知 + 裏での保存」を担う共通の本体。
// プラットフォームごとに違うのは adapter(保存係)だけ。
// 使う側は init() を起動時に1回待てば、あとは get/set がすべて同期になる。

type Entry = [key: string, value: string];

export type KVAdapter = {
  loadAll: () => Promise<Entry[]>;
  save: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const createKVStore = (adapter: KVAdapter) => {
  // 📋 机の上(メモリ)。読み取りは常にここから
  const cache = new Map<string, string>();
  // 🔔 key単位の購読者
  const listeners = new Map<string, Set<() => void>>();
  let initPromise: Promise<void> | null = null;

  const emit = (key: string) => {
    listeners.get(key)?.forEach((listener) => listener());
  };

  const warn = (action: string, key: string) => (e: unknown) => {
    console.warn(`kvStore: failed to ${action} "${key}"`, e);
  };

  return {
    /** 🚪 起動時に1回だけ呼ぶ。引き出しの中身を全部メモリに写す(何度呼んでも1回だけ実行) */
    init: (): Promise<void> => {
      initPromise ??= adapter
        .loadAll()
        .then((entries) => {
          for (const [key, value] of entries) {
            // 🛡️ 読み込み中に先にset済みのkeyは、新しいほうを優先して上書きしない
            if (!cache.has(key)) cache.set(key, value);
          }
        })
        .catch((e) => {
          console.warn("kvStore: failed to load", e);
        });
      return initPromise;
    },

    /** 📖 同期で読む。無ければnull */
    get: (key: string): string | null => cache.get(key) ?? null,

    /** ✍️ 同期で書く(保存は裏で行う) */
    set: (key: string, value: string): void => {
      cache.set(key, value);
      emit(key);
      adapter.save(key, value).catch(warn("save", key));
    },

    /** 🗑️ 同期で消す(保存側の削除は裏で行う) */
    remove: (key: string): void => {
      cache.delete(key);
      emit(key);
      adapter.remove(key).catch(warn("remove", key));
    },

    /** 🧹 全部消す */
    clear: (): void => {
      const keys = [...cache.keys()];
      cache.clear();
      keys.forEach(emit);
      adapter.clear().catch(warn("clear", "*"));
    },

    /** 🔔 key単位の変更通知。戻り値は購読解除関数(useSyncExternalStore用) */
    subscribe: (key: string, listener: () => void): (() => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(listener);
      return () => {
        const set = listeners.get(key);
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) listeners.delete(key);
      };
    },
  };
};
