// ✅active
// types/lang.ts

import { dictionary } from "./dictionary";

// 🟨ここに"jp"など追加可能。
export type Lang = "en";

// 🟩export type Section = "common" | "home" | ...
// と考えるとわかりやすい。
export type Section = keyof typeof dictionary;

// 🟩export type TranslationKey = "common.ok" | "common.ng" | "home.hello" | ...
// と考えるとわかりやすい。
export type TranslationKey = {
  [S in Section]: `${S}.${keyof (typeof dictionary)[S]["en"] & string}`;
}[Section];
