import { useContext } from "react";
import { THEME_COLORS } from "../constants/colors";
import { ThemeContext } from "../contexts/AppContexts";

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  const theme = ctx?.theme ?? "light"; // themeContextとsetThemeContextのうち、前者を取り出している
  const colors = THEME_COLORS[theme || "light"];

  return { theme, colors };
};
