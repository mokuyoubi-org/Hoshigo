// translations.ts

import { dictionary } from "@/src/active/language/dictionary";
import { Lang, Section, TranslationKey } from "@/src/active/language/lang";

/**
 * t(sectionAndKey, lang, params)
 * 指定セクション+キーの翻訳文字列を返す。
 * - lang未対応セクションは en にフォールバック
 * - keyが無ければ ""
 * - paramsで "{{key}}" を置換
 */
export const translation = (
  sectionAndKey: TranslationKey,
  lang: Lang,
  params?: Record<string, string | number>,
): string => {
  const [section, key] = sectionAndKey.split(".") as [Section, string];
  const sectionObj = dictionary[section];
  const langObj =
    (sectionObj as Record<string, Record<string, string>>)[lang] ??
    sectionObj.en;
  const value = langObj[key] ?? "";
  if (!params) return value;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{{${k}}}`, String(v)),
    value,
  );
};
