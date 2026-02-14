import { useContext } from "react";
import { ThemeContext, GobanThemeContext } from "../components/UserContexts";
import { THEME_COLORS } from "./colors";

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  const colors = THEME_COLORS[theme || "light"];
  
  return { theme, colors };
};