import { useContext } from "react";
import { ThemeContext } from "../components/UserContexts";
import { THEME_COLORS } from "../constants/colors";

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  const colors = THEME_COLORS[theme || "light"];

  return { theme, colors };
};
