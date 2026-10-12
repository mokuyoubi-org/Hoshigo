// constants/themeVars.ts
import { vars } from "nativewind";
import { DARK_COLORS, LIGHT_COLORS, type Palette } from "./colors";

const toVars = (palette: Palette) => vars(
    Object.fromEntries(
      Object.entries(palette).map(([key, value]) => [`--color-${key}`, value]),
    ),
  );

export const THEME_VARS = {
  light: toVars(LIGHT_COLORS),
  dark: toVars(DARK_COLORS),
};