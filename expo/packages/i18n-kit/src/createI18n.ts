// i18n-kit/src/createI18n.ts
// 2026/10/11: 整理
// 辞書を受け取ると、その辞書専用の translate関数 を作って返す。
// 辞書を渡すとそれを完全暗記した通訳さんを返してくれるということ。

import { translate } from "./translate";
import type { Dictionary, TranslationKeyOf } from "./types";

export const createI18n = <D extends Dictionary>(dictionary: D) => ({
  translate: (
    key: TranslationKeyOf<D>,
    lang: string,
    params?: Record<string, string | number>,
  ) => translate(dictionary, key, lang, params),
});