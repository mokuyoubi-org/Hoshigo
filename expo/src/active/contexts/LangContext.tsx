// @/src/active/contexts/LangContext.tsx

// ====================================================================================
// 【ファイル全体の責務】
// ⚡️コンテキストファイル⚡️
// 何をアプリ全体で共有してるか: 言語情報。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================

import { dictionary } from "@/src/active/constants/dictionary";
import { getLocales } from "expo-localization";
import React, { createContext, ReactNode, useContext, useState } from "react";
import { Lang } from "../types/translationTypes";

// 🟩🟧getLocales()で端末の言語情報を取得し、deviceLangに格納している。
const deviceLang = getLocales()[0]?.languageCode ?? "en";

// 🟩端末のデフォルト言語がdictionaryにおいても用意されているならそれがアプリ内におけるデフォルト言語となるが、なければEnglishがアプリ内のデフォルト言語となる。
const defaultLang: Lang =
  deviceLang in dictionary ? (deviceLang as Lang) : "en";

// 🟩⚡️context⚡️
const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>(null);

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

// 🟦Provider（データ配給係）
export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(defaultLang);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
};

// 🟦言語の取得・変更を行うためのフック（設定画面などで使用）
export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within a LangProvider");
  }
  return ctx;
};
