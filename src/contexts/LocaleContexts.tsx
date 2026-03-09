// @/src/contexts/LocaleContexts.tsx

import { Lang, t, TranslationKey, translations } from "@/src/services/translations";
import { getLocales } from "expo-localization";
import { createContext, useContext } from "react";

const deviceLang = getLocales()[0]?.languageCode ?? "en";
export const defaultLang: Lang = deviceLang in translations ? (deviceLang as Lang) : "en";

export const LangContext = createContext<Lang>(defaultLang);
export const SetLangContext = createContext<((lang: Lang) => void) | null>(null);

export const useTranslation = () => {
  const lang = useContext(LangContext);
  return {
    t: (key: TranslationKey, params?: Record<string, string | number>) =>
      params ? t(key, lang, params) : t(key, lang),
    lang,
  };
};