import { useContext } from "react";
import { THEME_COLORS } from "../constants/colors";
import { ThemeContext } from "../contexts/UserContexts";

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  const colors = THEME_COLORS[theme || "light"];

  return { theme, colors };
};
