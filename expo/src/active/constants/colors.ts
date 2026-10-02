// constants/colors.ts
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";
import colors from "tailwindcss/colors";
extend([mixPlugin]);

// opacityを指定したいとき、+"bb"とか書くのは禁止。
// colordのalphaを使うようにしよう。

const LIGHT_THEME = {
  // 手前にあるもの
  foreground: colors.white,
  // 背景色
  background: colord(colors.slate[100]).toHex(),
  backgroundStrong: colord(colors.slate[200]).toHex(),
  // テーマカラー
  primary: colord(colors.sky[500])
    .mix(colors.white, 0.5)
    .desaturate(0.3)
    .toHex(),
  primaryStrong: colord(colors.sky[900]).mix(colors.white, 0.4).toHex(),
  primaryDark: colord(colors.sky[900]).mix(colors.white, 0.4).toHex(),

  // オブジェクト
  blackStone: colord(colors.sky[950]).mix(colors.white, 0.2).toHex(),
  whiteStone: colord(colors.white).toHex(),

  // オーバーレイ
  overlay: colord(colors.zinc[950]).alpha(0.5).toHex(),

  // 文字
  text: colord(colors.zinc[600]).toHex(),
  textSub: colord(colors.zinc[400]).toHex(),
  textSubSub: colord(colors.zinc[300]).toHex(),
  textOpacity: colord(colors.zinc[700]).alpha(0.5).toHex(), // TextInputでのみ使われる

  // 段級位の色
  gray: colors.stone[300],
  blue: colord(colors.blue[400]).mix(colors.slate[200], 0.6).toHex(),
  green: colord(colors.green[600]).mix(colors.white, 0.4).toHex(),
  yellow: colord(colors.yellow[500]).mix(colors.white, 0.4).toHex(),
  rose: colord(colors.rose[400]).mix(colors.white, 0.4).toHex(),
  purple: colord(colors.purple[400]).mix(colors.white, 0.4).toHex(),

  // 特殊な色
  gold: colord(colors.amber[400]).mix(colors.white, 0.2).toHex(),
  silver: colord(colors.gray[400]).mix(colors.white, 0.2).toHex(),
  bronze: colord(colors.yellow[600]).mix(colors.white, 0.2).toHex(),

  // 成功、失敗
  success: colord(colors.green[600]).mix(colors.white, 0.2).toHex(),
  failure: colord(colors.red[400]).mix(colors.white, 0.2).toHex(),
  failureLight: colord(colors.red[200]).mix(colors.white, 0.4).toHex(),

  // 碁盤で使われる色
  humanMoveColor: colord(colors.red[700])
    .mix(colors.white, 0.5)
    .alpha(0.5)
    .toHex(),
  botMoveColor: colord(colors.green[600])
    .mix(colors.white, 0.2)
    .alpha(0.5)
    .toHex(),
} as const;

// 🌙 テーマで変わる色(ダーク)。キーはライトと完全に同じでないとTSエラーになる
const DARK_THEME: Record<keyof typeof LIGHT_THEME, string> = {
  // 手前にあるもの
  foreground: colord(colors.slate[800]).mix(colors.neutral[800], 0.3).toHex(),
  // 背景色
  background: colord(colors.slate[900]).mix(colors.neutral[800], 0.3).toHex(),
  backgroundStrong: colord(colors.slate[950])
    .mix(colors.slate[400], 0.3)
    .toHex(),
  // テーマカラー
  primary: colord(colors.sky[400])
    .mix(colors.neutral[800], 0.5)
    .desaturate(0.25)
    .toHex(),
  primaryStrong: colord(colors.sky[950]).mix(colors.neutral[50], 0.4).toHex(),
  primaryDark: colord(colors.sky[900]).mix(colors.neutral[800], 0.5).toHex(),

  // オブジェクト
  blackStone: colord(colors.slate[700]).mix(colors.neutral[600], 0.3).toHex(),
  whiteStone: colord(colors.slate[300]).mix(colors.neutral[400], 0.5).toHex(),

  // オーバーレイ
  overlay: colord(colors.slate[950]).alpha(0.8).toHex(),

  // 文字
  text: colord(colors.neutral[400]).mix(colors.slate[300], 0.3).toHex(),
  textSub: colord(colors.slate[400]).mix(colors.neutral[500], 0.4).toHex(),
  textSubSub: colord(colors.slate[500]).mix(colors.neutral[500], 0.4).toHex(),
  textOpacity: colord(colors.zinc[700]).alpha(0.6).toHex(), // TextInputでのみ使われる

  // 段級位の色
  gray: colord(colors.stone[400])
    .mix(colors.slate[800], 0.2)
    .desaturate(0.15)
    .toHex(),
  blue: colord(colors.blue[300])
    .mix(colors.slate[800], 0.2)
    .desaturate(0.15)
    .toHex(),
  green: colord(colors.green[300])
    .mix(colors.slate[800], 0.2)
    .desaturate(0.3)
    .toHex(),
  yellow: colord(colors.yellow[300])
    .mix(colors.slate[800], 0.2)
    .desaturate(0.2)
    .toHex(),
  rose: colord(colors.red[400]).mix(colors.slate[800], 0.2).toHex(),
  purple: colord(colors.purple[400]).mix(colors.slate[800], 0.2).desaturate(0.3).toHex(),

  // 特殊な色
  gold: colord(colors.amber[400]).desaturate(0.3).toHex(),
  silver: colord(colors.gray[400]).mix(colors.white, 0.2).toHex(),
  bronze: colord(colors.amber[700]).mix(colors.neutral[400], 0.3).toHex(),

  // 成功、失敗
  success: colord(colors.green[600]).mix(colors.slate[600], 0.6).toHex(),
  failure: colord(colors.red[400]).mix(colors.slate[600], 0.6).toHex(),
  failureLight: colord(colors.red[800]).mix(colors.neutral[800], 0.6).toHex(),

  // 碁盤で使われる色
  humanMoveColor: colord(colors.red[300])
    .mix(colors.neutral[400], 0.3)
    .alpha(0.5)
    .toHex(),
  botMoveColor: colord(colors.green[600])
    .mix(colors.neutral[300], 0.4)
    .alpha(0.85)
    .toHex(),
};

export const LIGHT_COLORS = { ...LIGHT_THEME } as const;
export const DARK_COLORS = { ...DARK_THEME } as const;

export type Palette = { [K in keyof typeof LIGHT_COLORS]: string };
