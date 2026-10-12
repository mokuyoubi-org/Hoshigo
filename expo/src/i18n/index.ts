// i18n/index.ts
// 2026/10/11: 整理

import { dictionary } from "@/src/i18n/dictionary";
import { createI18n } from "i18n-kit";

// createI18nは、辞書を渡すとそれを完全暗記した通訳さんを返してくれる、工場のような関数
export const { translate } = createI18n(dictionary);
