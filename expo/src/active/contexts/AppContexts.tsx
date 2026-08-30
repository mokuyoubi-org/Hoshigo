// @/src/active/contexts/AppContexts.tsx
// ここのコメントは消さない！！理解に役に立つから。
// ====================================================================================
// 【ファイル全体の責務】
// コンテキストファイル。メンテナンスなどアプリ自体の情報を、アプリ全体で共有している。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================

import React, { createContext, ReactNode, useContext, useState } from "react";

// 🟨型定義
// バージョン情報など、将来的に増える可能性あり。
type AppContextType = {
  maintenance: boolean;
  maintenanceMessage: string | null;
  setMaintenance: (v: boolean) => void;
  setMaintenanceMessage: (v: string | null) => void;
  isInitializing: boolean;
  setIsInitializing: (v: boolean) => void;
};

// 🟩🏢Context（外部には見せない）
// AppContextは、NHK。NHKというチャンネル名およびその建物そのもの。いわばNHKの外側。
const AppContext = createContext<AppContextType | null>(null);

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

// 🟨🟦📡Provider（データ配給係）
// AppProviderはNHKの内側。実際に働く人々。放送する仕事を受け持つ
// バージョン情報など、将来的に増える可能性あり。
export const AppProvider = ({ children }: { children: ReactNode }) => {
  // state, setterは今放送中の番組内容。
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(true);


  return (
    // AppContext.Providerは、電波塔。
    // childrenは、電波を届ける街。
    <AppContext.Provider
      value={{
        maintenance,
        maintenanceMessage,
        setMaintenance,
        setMaintenanceMessage,
        isInitializing,
        setIsInitializing,
      }}
    >
      {children} 
    </AppContext.Provider>
  );
};

// 🟩🟦Hook（使う側の窓口）
// useAppはmaintenance, maintenanceMessage, setMaintenance, setMaintenanceMessageを自由にお家から使えるリモコン。
// const { maintenance, maintenanceMessage } = useApp();のように使う。
export const useApp = () => {
  // useContextは、NHKの電波を受け取る、家側の受信機。
  // ctxは、受け取った内容。
  const ctx = useContext(AppContext);
  // 契約していない(AppProviderが包んでいる範囲外の)お家（component）ではこのリモコンは使えないよ、ということ。
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
};
