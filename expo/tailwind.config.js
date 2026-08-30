/** 
 *  tailwind.config.js
 * 
 * 【このファイルの役割】
 *  colors.ts を theme.colors に登録する
 */

require("ts-node/register");
const { COLORS } = require("./src/active/constants/colors.ts");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: COLORS,
    },
  },
  plugins: [],
};
