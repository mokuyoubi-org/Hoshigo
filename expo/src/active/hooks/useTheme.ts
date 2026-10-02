// hooks/useTheme.ts
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useKVStorage } from "storage-kit";
import { DARK_COLORS, LIGHT_COLORS, type Palette } from "../constants/colors";

export type ThemeMode = "system" | "light" | "dark";

// 🎛️ 設定値(system/light/dark)の読み書き。ThemeModalが使う
export function useThemeMode() {
  const { value, setValue, isLoaded } = useKVStorage<ThemeMode>(
    "global.mode",
    "light",
  );
  return { mode: value, setMode: setValue, isLoaded };
}

// 🔌 _layout.tsx で1回だけ呼ぶ。保存された設定をNativeWindに流し込む。
// 戻り値がfalseの間はまだ反映前なので、呼び出し側は描画を待つ(チラつき防止)
export function useApplyTheme(): boolean {
  const { mode, isLoaded } = useThemeMode();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    // requestAnimationFrame の代わりに setTimeout でマウント完了後に非同期で実行する
    const timer = setTimeout(() => {
      setColorScheme(mode);
      setApplied(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [isLoaded, mode, setColorScheme]);

  // ⚠️ Web向けのCSS変数反映
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const palette = colorScheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
    for (const [key, value] of Object.entries(palette)) {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    }
  }, [colorScheme]);

  return applied;
}

// 🎨 インライン色が必要な時に使う。「今のパレット」を返す
export function useColors(): Palette {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
}
