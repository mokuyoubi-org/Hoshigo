// expo-katago/src/i18n/index.ts
// 2026/10/11: 整理

import { createI18n } from "i18n-kit";
import { kataGoDictionary } from "./dictionary";

// createI18nは、辞書を渡すとそれを完全暗記した通訳さんを返してくれる、工場のような関数
// というわけでここではkataGoDictionaryを渡すことで通訳さんを誕生させている
export const { translate } = createI18n(kataGoDictionary);
