// MatchingContext.tsx
// Contextの定義と、Providerの箱だけ。中身のロジックは useMatchingProvider に集約されている。
// フェーズによる出し分け(未DL/DL中/ウォームアップ中/自動クローズ)は
// AIDownloadModal自身がgetModelStatusを見て行うので、ここでは常に同じ
// モーダルを出すだけでよい。

import { LoginModal } from "@/src/components/modals/settingsScreen/LoginModal";
import { useMatchingProvider } from "@/src/hooks/rpc/useMatchingProvider";
import { BoardSize } from "go-core";
import { createContext, ReactNode, useContext } from "react";
import { useOverlay } from "./OverlayContext";

type MatchingContextType = {
  isMatching: boolean;
  matchingBoardSize: BoardSize | null;
  startMatching: (boardSize: BoardSize) => Promise<void>;
  cancelMatching: () => void;
};

export const MatchingContext = createContext<MatchingContextType | null>(null);

export const MatchingProvider = ({ children }: { children: ReactNode }) => {
  const { show, hide } = useOverlay();
  // ログインしていない人が対局ボタンを押したら、ログイン画面を出す
  const value = useMatchingProvider(() =>
    show(<LoginModal visible={true} onClose={hide} />),
  );

  return (
    <MatchingContext.Provider value={value}>
      {children}
    </MatchingContext.Provider>
  );
};

export const useMatching = () => {
  const context = useContext(MatchingContext);
  if (!context) {
    throw new Error("useMatching must be used within a MatchingProvider");
  }
  return context;
};
