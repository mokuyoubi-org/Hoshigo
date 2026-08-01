// ====================================================================================
// 【ファイル全体の責務】
// ⚡️コンテキストファイル⚡️
// 何をアプリ全体で共有してるか: アプリ自体の情報。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================

import React, { createContext, ReactNode, useContext, useState } from "react";

// 1. 型定義
type AppContextType = {
  maintenance: boolean;
  maintenanceMessage: string | null;
  setMaintenance: (v: boolean) => void;
  setMaintenanceMessage: (v: string | null) => void;
};

// ⚡️Context本体⚡️（外部には見せない）
const AppContext = createContext<AppContextType | null>(null);

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

// 🟦Provider（データ配給係）
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );

  return (
    <AppContext.Provider
      value={{
        maintenance,
        maintenanceMessage,
        setMaintenance,
        setMaintenanceMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// 🟦Hook（使う側の窓口）
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
};
