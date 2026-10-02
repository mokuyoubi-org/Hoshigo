/**
 *  tailwind.config.js
 *
 * 【このファイルの役割】
 *  colors.ts のキー一覧を、CSS変数への参照として theme.colors に登録する。
 *  実際の色の値は themeVars.ts の vars() がルートで注入する(ライト/ダーク切替)。
 */

require("ts-node/register");
const { LIGHT_COLORS } = require("./src/active/constants/colors.ts");

// 🎨 { background: "var(--color-background)", ... } を自動生成
const themeColors = Object.fromEntries(
  Object.keys(LIGHT_COLORS).map((key) => [key, `var(--color-${key})`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
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
