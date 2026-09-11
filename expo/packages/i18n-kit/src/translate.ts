// i8n-kit/src/translate.ts

import type { Dictionary, LangOf, SectionOf, TranslationKeyOf } from "./types";

export function translate<D extends Dictionary>(
  dictionary: D,
  sectionAndKey: TranslationKeyOf<D>,
  lang: LangOf<D>,
  params?: Record<string, string | number>,
): string {
  const [section, key] = (sectionAndKey as string).split(".") as [
    SectionOf<D>,
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
}