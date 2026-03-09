// @/src/contexts/LocaleContexts.tsx
import { Lang, translations } from "@/src/services/translations";
import { getLocales } from "expo-localization";
import { createContext } from "react";

const deviceLang = getLocales()[0]?.languageCode ?? "en";
const defaultLang: Lang =
  deviceLang in translations ? (deviceLang as Lang) : "en";

export const LangContext = createContext<Lang>(defaultLang);
export const SetLangContext = createContext<((lang: Lang) => void) | null>(
  null,
);
