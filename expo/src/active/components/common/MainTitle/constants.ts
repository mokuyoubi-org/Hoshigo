import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka";
import { Jua_400Regular } from "@expo-google-fonts/jua";
import {
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
} from "@expo-google-fonts/m-plus-rounded-1c";

// 🌟 弧を描く5つの星の配置データ
export const STARS_CONFIG = [
  { size: 24, x: -78, y: 18, rotate: "-24deg" },
  { size: 30, x: -42, y: 4.5, rotate: "-12deg" },
  { size: 36, x: 0, y: 0, rotate: "0deg" },
  { size: 30, x: 42, y: 4.5, rotate: "12deg" },
  { size: 24, x: 78, y: 18, rotate: "24deg" },
];

// 🔤 使うフォントはここだけに登録(キー名がそのままフォント名になります)
export const FONTS = {
  MPLUSRounded1c_900Black,
  MPLUSRounded1c_800ExtraBold,
  Fredoka_600SemiBold,
  Jua_400Regular,
  Chango: require("@/assets/fonts/Chango-Regular.ttf"),
  Maoken: require("@/assets/fonts/MaokenAssortedSans.ttf"),
};

export type FontName = keyof typeof FONTS;

// タイトルを入れる箱の幅(px)。親の幅に関係なくこの幅で固定
// タイトルの文字より十分広ければOK(狭いと折り返します)
export const TITLE_BOX_WIDTH = 480;