// fonts.ts

import { RESOURCE_HAN_ROUNDED } from "./resourceHanRoundedSource";

// 🔤 アプリで使うフォントはここだけに登録(キー名がそのままフォント名になります)
export const FONTS = {
  ResourceHanRoundedJ: RESOURCE_HAN_ROUNDED,
  Chango: require("@/assets/fonts/Chango-Regular.ttf"), // 英語版のタイトルのみで使用。39KB
};

export type FontName = keyof typeof FONTS;

// 🌏 アプリ全体の標準フォント(言語ごとに1つ)
const APP_FONT_BY_LANG: Record<"ja" | "en" | "zh" | "ko", FontName> = {
  ja: "ResourceHanRoundedJ",
  en: "ResourceHanRoundedJ",
  zh: "ResourceHanRoundedJ",
  ko: "ResourceHanRoundedJ",
};

type AppLangKey = keyof typeof APP_FONT_BY_LANG;

// 未知の言語は日本語扱い
export const getAppFont = (lang: string): FontName =>
  APP_FONT_BY_LANG[(lang in APP_FONT_BY_LANG ? lang : "ja") as AppLangKey];
