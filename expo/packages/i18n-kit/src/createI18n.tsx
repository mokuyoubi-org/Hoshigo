// createI18n.tsx
//
// 「辞書オブジェクトを渡すと、Provider・useLang・useTranslationが
// できあがって返ってくる」という工場関数。辞書の中身(実際の日本語/英語の
// 文言)は一切知らない。渡された辞書の"形"から型を自動で組み立てるだけ。

import { getLocales } from "expo-localization";
import React, { createContext, ReactNode, useContext, useState } from "react";

// 末端の値は基本的に文字列だが、matchTypesのような「番号→ラベル」の
// 小さな対応表など、文字列でない入れ子データが混ざることもあるためanyにしている。
// (t()で取り出すのは文字列キーのみを想定。入れ子データはdictionaryを直接参照する)
type Dictionary = Record<string, Record<string, Record<string, any>>>;

export function createI18n<D extends Dictionary>(dictionary: D) {
  type Section = keyof D & string;
  type Lang = keyof D[Section] & string;
  type TranslationKey = {
    [S in Section]: `${S}.${keyof D[S][Lang] & string}`;
  }[Section];

  const sections = Object.keys(dictionary) as Section[];
  const firstSection = sections[0];

  const deviceLang = getLocales()[0]?.languageCode ?? "en";
  const defaultLang = (
    firstSection && deviceLang in dictionary[firstSection] ? deviceLang : "en"
  ) as Lang;

  const translate = (
    sectionAndKey: TranslationKey,
    lang: Lang,
    params?: Record<string, string | number>,
  ): string => {
    const [section, key] = (sectionAndKey as string).split(".") as [
      Section,
      string,
    ];
    const sectionObj = dictionary[section] as Record<
      string,
      Record<string, string>
    >;
    const langObj = sectionObj[lang] ?? sectionObj.en ?? {};
    const value = langObj[key] ?? "";
    if (!params) return value;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replaceAll(`{{${k}}}`, String(v)),
      value,
    );
  };

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
      translate(key, lang, params);
  };

  return { LangProvider, useLang, useTranslation, translate };
}
