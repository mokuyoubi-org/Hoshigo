// hooks/useTheme.ts
import { DARK_COLORS, LIGHT_COLORS } from "@/src/constants/colors";
import { useKVStorage } from "kv-store";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { ThemeMode } from "../../types/theme";

// 🎛️ 設定値(system/light/dark)の読み書き。ThemeModalが使う
export const useThemeMode = () => {
  const { value, setValue } = useKVStorage<ThemeMode>("global.mode", "light");
  return { mode: value, setMode: setValue };
};

// 🔌 _layout.tsx で1回だけ呼ぶ。保存された設定をNativeWindに流し込む。
// 戻り値がfalseの間はまだ反映前なので、呼び出し側は描画を待つ(チラつき防止)
export const useApplyTheme = () => {
  const { mode } = useThemeMode();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    // requestAnimationFrame の代わりに setTimeout でマウント完了後に非同期で実行する
    const timer = setTimeout(() => {
      setColorScheme(mode);
      setApplied(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [mode, setColorScheme]);

  // ⚠️ Web向けのCSS変数反映
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const palette = colorScheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
    for (const [key, value] of Object.entries(palette)) {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    }
  }, [colorScheme]);

  return applied;
};

// 🎨 インライン色が必要な時に使う。「今のパレット」を返す
export const useColors = () => {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
};
