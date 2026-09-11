// i8n-kit/src/createi18n.tsx

import { getLocales } from "expo-localization";
import React, { createContext, ReactNode, useContext, useState } from "react";
import { resolveDefaultLang } from "./resolveDefaultLang";
import { translate } from "./translate";
import type { Dictionary, LangOf, TranslationKeyOf } from "./types";

export function createI18n<D extends Dictionary>(dictionary: D) {
  type Lang = LangOf<D>;
  type TranslationKey = TranslationKeyOf<D>;

  const deviceLang = getLocales()[0]?.languageCode ?? "en"; // 💡💡💡ここで端末から言語情報を取ってきてる
  const defaultLang = resolveDefaultLang(dictionary, deviceLang);

  const LangContext = createContext<{
    lang: Lang;
    setLang: (lang: Lang) => void;
  } | null>(null);

  const LangProvider = ({ children }: { children: ReactNode }) => {
    const [lang, setLang] = useState<Lang>(defaultLang);
    return (
      <LangContext.Provider value={{ lang, setLang }}>
        {children}
      </LangContext.Provider>
    );
  };

  const useLang = () => {
    const ctx = useContext(LangContext);
    if (!ctx) throw new Error("useLang must be used within a LangProvider");
    return ctx;
  };

  const useTranslation = () => {
    const { lang } = useLang();
    return (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(dictionary, key, lang, params);
  };

  return {
    LangProvider,
    useLang,
    useTranslation,
    translate: (
      key: TranslationKey,
      lang: Lang,
      params?: Record<string, string | number>,
    ) => translate(dictionary, key, lang, params),
  };
}
