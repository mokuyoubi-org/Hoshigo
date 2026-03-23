import { useContext } from "react";
import { THEME_COLORS } from "@/src/constants/colors";
import { ThemeContext } from "@/src/contexts/AppContexts";

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  const theme = ctx?.theme ?? "standard"; // themeContextとsetThemeContextのうち、前者を取り出している
  const colors = THEME_COLORS[theme];

  return { theme, colors };
};
