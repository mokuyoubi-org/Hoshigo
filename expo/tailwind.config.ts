/**
 *  tailwind.config.ts
 *
 * 【このファイルの役割】
 *  colors.ts のキー一覧を、CSS変数への参照として theme.colors に登録する。
 *  実際の色の値は themeVars.ts の vars() がルートで注入する(ライト/ダーク切替)。
 */

import type { Config } from "tailwindcss";
import { LIGHT_COLORS } from "./src/constants/colors";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativewindPreset = require("nativewind/preset");

// 🎨 { background: "var(--color-background)", ... } を自動生成
const themeColors = Object.fromEntries(
  Object.keys(LIGHT_COLORS).map((key) => [key, `var(--color-${key})`]),
);

const config: Config = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [nativewindPreset],
  // 🌗 webでもsetColorSchemeで手動切替するために必須
  darkMode: "class",
  theme: {
    extend: {
      colors: themeColors,
      spacing: {
        160: "640px",
      },
    },
  },
  plugins: [],
};

export default config;