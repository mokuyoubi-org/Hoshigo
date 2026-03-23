import { createContext } from "react";

// メンテナンス中か否か
export const MaintenanceContext = createContext<{
  maintenance: boolean | null;
  setMaintenance: ((v: boolean) => void) | null;
} | null>(null);

// メンテナンスメッセージ
export const MaintenanceMessageContext = createContext<{
  maintenanceMessage: string | null;
  setMaintenanceMessage: ((v: string) => void) | null;
} | null>(null);

// テーマ
export const ThemeContext = createContext<{
  theme: "standard" ;
  setTheme: (theme: "standard") => void;
} | null>(null);

// 碁盤テーマ
export const GobanThemeContext = createContext<{
  gobanTheme: "standard" ;
  setGobanTheme: (theme: "standard" ) => void;
} | null>(null);
