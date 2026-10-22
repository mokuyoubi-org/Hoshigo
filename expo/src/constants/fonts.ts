// fonts.ts

// アプリで使うフォントはここだけに登録(キー名がそのままフォント名になります)
export const FONTS = {
  HanRoundedJA: require("@/assets/fonts/HanRoundedJA-Bold.ttf"), // 6.7MB。常用漢字+英数字
  HanRoundedSC: require("@/assets/fonts/HanRoundedSC-Bold.ttf"), // 5.4MB。常用漢字+英数字+ピンイン系
  HanRoundedKO: require("@/assets/fonts/HanRoundedKO-Bold.ttf"), // 3.7MB。ハングル+英数字
  HanRoundedEN: require("@/assets/fonts/HanRoundedEN-Bold.ttf"), // 109KB。その他英数字系+記号

  TitleEN: require("@/assets/fonts/Chango-Regular.ttf"),
  TitleJA: require("@/assets/fonts/title-font-JA.ttf"),
  TitleKO: require("@/assets/fonts/title-font-KO.ttf"),
  TitleSC: require("@/assets/fonts/title-font-SC.ttf"),
};

export type FontName = keyof typeof FONTS;

// 🌏 アプリ全体の標準フォント(言語ごとに1つ)
const APP_FONT_BY_LANG: Record<"ja" | "en" | "zh" | "ko", FontName> = {
  ja: "HanRoundedJA",
  en: "HanRoundedEN",
  zh: "HanRoundedSC",
  ko: "HanRoundedKO",
};

type AppLangKey = keyof typeof APP_FONT_BY_LANG;

// 未知の言語は日本語扱い
export const getAppFont = (lang: string): FontName =>
  APP_FONT_BY_LANG[(lang in APP_FONT_BY_LANG ? lang : "ja") as AppLangKey];
