// titleConfig.ts

import { FontName } from "@/src/constants/fonts";
import { PlatformKey } from "@/src/types/platform";
import { Platform } from "react-native";
import { TITLE_TUNING } from "./titleTuning";

export type TitleConfig = {
  topFont: FontName;
  titleFont: FontName;
  subFont: FontName;
  fontSize: number;
  letterSpacing: number;
  titleOffsetY: number;
  subtitleOffsetY: number;
  showSubtitle: boolean;
};

export const getPlatformKey = (): PlatformKey =>
  Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";

// 未知の言語は英語扱い
export const toLangKey = (lang: string): string =>
  lang === "ja" || lang === "en" || lang === "zh" || lang === "ko"
    ? lang
    : "en";

// 🎛️ 言語ごとの基本の見た目の設定はここだけ触ればOK
// (端末ごとの微調整は titleTuning.ts の管理室で行います)
const getBaseConfig = (lang: string, width: number): TitleConfig => {
  const configs: Record<string, TitleConfig> = {
    ja: {
      topFont: "ResourceHanRoundedJA",
      titleFont: "TitleJA" /** メインタイトルのフォント */,
      subFont:
        "ResourceHanRoundedJA" /** 「オンライン対局」やサブタイトルのフォント */,
      fontSize: Math.min(
        120,
        width * 0.3,
      ) /** メインタイトルの文字サイズ(px)。親の幅に関係なく固定 */,
      letterSpacing: 0 /** 文字間隔 */,
      titleOffsetY: 0 /** メインタイトルを下にずらす量(px)。プラスで下、マイナスで上 */,
      subtitleOffsetY: 0 /** サブタイトルを下にずらす量(px) */,
      showSubtitle: true /** サブタイトル(Hoshigoなど)を表示するか */,
    },
    en: {
      topFont: "ResourceHanRoundedJA",
      titleFont: "TitleEN", // せいぜい39KBなのでOK
      subFont: "ResourceHanRoundedJA", // 適当
      fontSize: Math.min(96, width * 0.2),
      letterSpacing: 0,
      titleOffsetY: 0,
      subtitleOffsetY: 0,
      showSubtitle: false,
    },
    zh: {
      topFont: "ResourceHanRoundedSC",
      titleFont: "TitleSC",
      subFont: "ResourceHanRoundedSC",
      fontSize: Math.min(108, width * 0.28),
      letterSpacing: 0,
      titleOffsetY: 0,
      subtitleOffsetY: 0,
      showSubtitle: true,
    },
    ko: {
      topFont: "ResourceHanRoundedKO",
      titleFont: "TitleKO",
      subFont: "ResourceHanRoundedKO",
      fontSize: Math.min(108, width * 0.3),
      letterSpacing: 6,
      titleOffsetY: 0,
      subtitleOffsetY: 0,
      showSubtitle: true,
    },
  };
  return configs[lang];
};

// 基本設定 + 管理室(titleTuning.ts)のズレ量 = 実際に使う設定
export const resolveTitleConfig = (
  lang: string,
  width: number,
): TitleConfig => {
  const base = getBaseConfig(lang, width);
  const tuning = TITLE_TUNING[getPlatformKey()][lang];
  return {
    ...base,
    fontSize: Math.max(1, base.fontSize + tuning.fontSizeDelta),
    letterSpacing: base.letterSpacing + tuning.letterSpacingDelta,
    titleOffsetY: base.titleOffsetY + tuning.titleOffsetY,
    subtitleOffsetY: base.subtitleOffsetY + tuning.subtitleOffsetY,
  };
};
