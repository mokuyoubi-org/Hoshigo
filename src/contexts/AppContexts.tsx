import { createContext } from "react";

export const MaintenanceContext = createContext<boolean | null>(null);
export const MaintenanceMessageContext = createContext<string | null>(null);



export const ThemeContext = createContext<{
  theme: "standard" | "light" | "dark";
  setTheme: (theme: "standard" | "light" | "dark") => void;
} | null>(null);



export const GobanThemeContext = createContext<
  ("standard" | "light" | "dark") | null
>(null);
export const SetGobanThemeContext = createContext<
  ((theme: "standard" | "light" | "dark") => void) | null
>(null);