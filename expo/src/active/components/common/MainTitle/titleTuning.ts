// 🛠️ タイトル管理室
// 端末(iOS / Android / Web)× 言語 ごとの微調整は、このファイルの数字だけ触ればOKです。
// 数字は「基本設定(titleConfig.ts)からのズレ量」。0 なら基本のままです。
//
//   titleOffsetY       タイトルの上下位置(px)     +で下 / -で上
//   fontSizeDelta      タイトルの大きさ(px)       +で大きく / -で小さく
//   letterSpacingDelta 文字の間隔(px)             +で広く / -で狭く
//   subtitleOffsetY    サブタイトルの上下位置(px) +で下 / -で上
//
// 例) iOS の日本語タイトルを少し下げたい → ios.ja の titleOffsetY を 4 にする

export type LangKey = "ja" | "en" | "zh" | "ko";
export type PlatformKey = "ios" | "android" | "web";

export type TitleTuning = {
  titleOffsetY: number;
  fontSizeDelta: number;
  letterSpacingDelta: number;
  subtitleOffsetY: number;
};

// prettier-ignore
export const TITLE_TUNING: Record<PlatformKey, Record<LangKey, TitleTuning>> = {
  ios: {
    ja: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    en: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    zh: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    ko: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
  },
  android: {
    ja: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    en: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    zh: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    ko: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
  },
  web: {
    ja: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    en: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    zh: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
    ko: { titleOffsetY: 0, fontSizeDelta: 0, letterSpacingDelta: 0, subtitleOffsetY: 0 },
  },
};
