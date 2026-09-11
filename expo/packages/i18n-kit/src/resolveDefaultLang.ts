// i8n-kit/src/resolveDefaultLang.ts

import type { Dictionary, LangOf, SectionOf } from "./types";

/** deviceLangが辞書でサポートされていればそれを、なければ"en"を返す純粋関数 */
export function resolveDefaultLang<D extends Dictionary>(
  dictionary: D,
  deviceLang: string,
): LangOf<D> {
  const sections = Object.keys(dictionary) as SectionOf<D>[];
  const firstSection = sections[0];
  const isSupported = firstSection && deviceLang in dictionary[firstSection];
  return (isSupported ? deviceLang : "en") as LangOf<D>;
}