// Hoshigo
// AppContexts.tsx
// app_statusの情報を、アプリ全体で共有している。
// ⚠️理解に役立つので、このファイルのコメントは消さない。

import { createContext, ReactNode, useContext, useState } from "react";

// null: 問題なし(全一致)
// "app": app_versionの不一致
// "ota": ota_versionの不一致
export type UpdateReason = "app" | "ota" | null;

// 型定義
type AppContextType = {
  maintenance: boolean;
  maintenanceMessage: string | null;
  setMaintenance: (v: boolean) => void;
  setMaintenanceMessage: (v: string | null) => void;
  isInitializing: boolean;
  setIsInitializing: (v: boolean) => void;
  updateReason: UpdateReason;
  setUpdateReason: (v: UpdateReason) => void;
};

// 🏢Context（外部には見せない）
// AppContextは、NHK。NHKというチャンネル名およびその建物そのもの。いわばNHKの外側。
const AppContext = createContext<AppContextType | null>(null);

// 📡Provider（データ配給係）
// AppProviderはNHKの内側。実際に働く人々。放送する仕事を受け持つ
export const AppProvider = ({ children }: { children: ReactNode }) => {
  // state, setterは今放送中の番組内容。
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [updateReason, setUpdateReason] = useState<UpdateReason>(null);

  return (
    // AppContext.Providerは、電波塔。
    <AppContext.Provider
      value={{
        maintenance,
        maintenanceMessage,
        setMaintenance,
        setMaintenanceMessage,
        isInitializing,
        setIsInitializing,
        updateReason,
        setUpdateReason,
      }}
    >
      {
        // childrenは、電波を届ける対象の街。
        children
      }
    </AppContext.Provider>
  );
};

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
