// tailwind.config.ts
// Tailwindの「メニュー設計書」。どんなクラス名が使えるか、どこを探すかを決める。
// このファイルでは、colors.ts の色の名前を「CSS変数(箱)への参照」として登録している。
// 箱の中身(実際の色)は、themeVars.ts の vars() がルートで入れる(ライト/ダーク切替)。

import type { Config } from "tailwindcss";
import { LIGHT_COLORS } from "./src/constants/colors";

// NativeWind用の追加設定セット。
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativewindPreset = require("nativewind/preset");

// 🎨 colors.ts の色の名前から、こんな辞書を自動で作る:
// { background: "var(--color-background)", ... }
// 「background という名前の箱の、今の中身を使ってね」という意味。
const themeColors = Object.fromEntries(
  Object.keys(LIGHT_COLORS).map((key) => [key, `var(--color-${key})`]),
);

const config: Config = {
  // Tailwindが「使われているクラス名」を探しにいくファイル。
  // ここに入っていない場所のclassNameは、効かない。
  content: ["./src/**/*.{js,jsx,ts,tsx}"],

  // NativeWind用の設定セット。
  presets: [nativewindPreset],

  // 🌗 ダークモードを「端末任せ」ではなく、アプリから手動で切り替える方式にする。
  // webでもsetColorSchemeで手動切替するために必須。
  darkMode: "class",

  theme: {
    // extend = 標準の辞書を残したまま、独自の言葉を足す。
    extend: {
      // bg-background, text-text などが使えるようになる。
      colors: themeColors,

      // p-160, w-160 などが使えるようになる独自の大きさ。
      spacing: {
        160: "640px",
      },
    },
  },

  // 追加プラグインは使っていない。
  plugins: [],
};

export default config;