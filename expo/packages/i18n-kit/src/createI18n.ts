// i18n-kit/src/createI18n.ts

import { translate } from "./translate";
import type { Dictionary, LangOf, TranslationKeyOf } from "./types";

export function createI18n<D extends Dictionary>(dictionary: D) {
  type Lang = LangOf<D>;
  type TranslationKey = TranslationKeyOf<D>;

  return {
    translate: (
      key: TranslationKey,
      lang: Lang,
      params?: Record<string, string | number>,
    ) => translate(dictionary, key, lang, params),
  };
}