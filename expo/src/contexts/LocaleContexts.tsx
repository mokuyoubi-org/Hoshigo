// @/src/contexts/LocaleContexts.tsx

import {
  Lang,
  t,
  TranslationKey,
  translations,
} from "@/src/services/translations";
import { getLocales } from "expo-localization";
import { createContext, useContext } from "react";

const deviceLang = getLocales()[0]?.languageCode ?? "en";
export const defaultLang: Lang =
  deviceLang in translations ? (deviceLang as Lang) : "en";

export const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>({
  lang: defaultLang,
  setLang: () => {}, // 仮の関数（空っぽ）
});

export const useTranslation = () => {
  const ctx = useContext(LangContext);

  if (!ctx) throw new Error("LangContextないにゃん");

  const { lang } = ctx;

  return {
    t: (key: TranslationKey, params?: Record<string, string | number>) =>
      params ? t(key, lang, params) : t(key, lang),
    lang,
  };
};
