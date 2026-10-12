// types.ts
// 2026/10/11: 整理

import type { dictionary } from "@/src/i18n/dictionary";
import type { TranslationKeyOf } from "i18n-kit";

// 🪧 対応言語の看板。言語を増やすときはここに足す。
export const LANGS = ["ja", "en", "zh", "ko"] as const;

export type Lang = (typeof LANGS)[number];

// "common.ok" | "common.ng" | "home.hello" | ... のように自動生成される。
export type TranslationKey = TranslationKeyOf<typeof dictionary>;

// useTranslation() が返す翻訳関数の型
export type TFunction = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;