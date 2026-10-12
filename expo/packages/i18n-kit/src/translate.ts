// i18n-kit/src/translate.ts
// 2026/10/11: 整理
// "common.home"という文字列を受け取ると、common と home に分け、辞書から該当言語の文言を探す。
// なければ en、それもなければ空文字。{{name}} の置き換えもする。
// 通訳さん本人。"common.home"って何？って聞いたら即座に"Home"やで、って返してくれる

import type { Dictionary, TranslationKeyOf } from "./types";

export const translate = <D extends Dictionary>(
  dictionary: D,
  sectionAndKey: TranslationKeyOf<D>,
  lang: string,
  params?: Record<string, string | number>,
): string => {
  const [section, key] = (sectionAndKey as string).split(".");
  const langs: Dictionary[string] = dictionary[section] ?? {};
  // 指定言語になければen、それもなければ空文字
  const value: string = langs[lang]?.[key] ?? langs.en?.[key] ?? "";
  if (!params) return value;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{{${k}}}`, String(v)),
    value,
  );
};