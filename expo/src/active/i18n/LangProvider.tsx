// src/active/i18n/LangProvider.tsx

import type { LangOf } from "i18n-kit";
import React, { createContext, ReactNode, useContext, useState } from "react";
import { useKVStorage } from "storage-kit";
import { translate } from ".";
import { dictionary } from "./dictionary";
import { LANGUAGE_STORAGE_KEY } from "./langStorageKey";
import type { TranslationKey } from "./types";

type Lang = LangOf<typeof dictionary>;

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // 🟨初期値は仮のenでよい。実際の言語決定はLangSyncが担う。
  const [lang, setLang] = useState<Lang>("en" as Lang);
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}

export function useTranslation() {
  const { lang } = useLang();
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(key, lang, params);
}

// 🟩 言語を「変更する」ための唯一の入り口。
// KVStorageへ保存する→その変更をLangSyncが検知してContextへ反映、という流れになる。
// 呼び出し側はKVStorageのkey文字列を一切知らなくてよい。
export function useSetLang() {
  const { setValue } = useKVStorage<Lang | null>(LANGUAGE_STORAGE_KEY, null);
  return (next: Lang) => setValue(next);
}