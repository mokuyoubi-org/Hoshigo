import { useLang } from "../contexts/LangContext";

// @/src/active/lib/translations.ts

import { dictionary } from "../constants/dictionary";
import { Lang, Section, TranslationKey } from "../types/translationTypes";

export const t = (
  sectionAndKey: TranslationKey,
  lang: Lang,
  params?: Record<string, string | number>,
): string => {
  const [section, key] = sectionAndKey.split(".") as [Section, string];

  // anyを使わずに安全に値を取り出す
  const sectionObj = dictionary[section];
  const langObj =
    (sectionObj as Record<string, Record<string, string>>)[lang] ??
    sectionObj.en;

  let value = langObj[key] ?? "";

  if (!params) return value;

  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{{${k}}}`, String(v)),
    value,
  );
};

// 文字の翻訳表示専用フック
export const useTranslation = () => {
  const { lang } = useLang();

  return (key: TranslationKey, params?: Record<string, string | number>) =>
    t(key, lang, params);
};
