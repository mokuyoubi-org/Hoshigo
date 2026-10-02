import {
  Fredoka_300Light,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import { Jua_400Regular } from "@expo-google-fonts/jua";
import {
  MPLUSRounded1c_100Thin,
  MPLUSRounded1c_300Light,
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
} from "@expo-google-fonts/m-plus-rounded-1c";

// 🔤 アプリで使うフォントはここだけに登録(キー名がそのままフォント名になります)
export const FONTS = {
  // MPLUS
  MPLUSRounded1c_100Thin,
  MPLUSRounded1c_300Light,
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
  // Fredoka
  Fredoka_300Light,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  // Jua
  Jua_400Regular,
  // Chango
  Chango: require("@/assets/fonts/Chango-Regular.ttf"),
  // Maoken
  Maoken: require("@/assets/fonts/MaokenAssortedSans.ttf"),
};

export type FontName = keyof typeof FONTS;

// 🌏 アプリ全体の標準フォント(言語ごとに1つ)
const APP_FONT_BY_LANG: Record<"ja" | "en" | "zh" | "ko", FontName> = {
  ja: "MPLUSRounded1c_700Bold",
  en: "Fredoka_500Medium",
  zh: "Maoken",
  ko: "Jua_400Regular",
};

type AppLangKey = keyof typeof APP_FONT_BY_LANG;

// 未知の言語は日本語扱い
export const getAppFont = (lang: string): FontName =>
  APP_FONT_BY_LANG[(lang in APP_FONT_BY_LANG ? lang : "ja") as AppLangKey];
