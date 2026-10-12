// MatchingContext.tsx
// Contextの定義と、Providerの箱だけ。中身のロジックは useMatchingProvider に集約されている。
// フェーズによる出し分け(未DL/DL中/ウォームアップ中/自動クローズ)は
// AIDownloadModal自身がgetModelStatusを見て行うので、ここでは常に同じ
// モーダルを出すだけでよい。

import { DailyLimitModal } from "@/src/components/modals/game/DailyLimitModal";
import { useMatchingProvider } from "@/src/hooks/rpc/useMatchingProvider";
import { BoardSize } from "go-core";
import React, { createContext, useContext } from "react";
import { useOverlay } from "./OverlayContext";

type MatchingContextType = {
  isMatching: boolean;
  matchingBoardSize: BoardSize | null;
  startMatching: (boardSize: BoardSize) => Promise<void>;
  cancelMatching: () => Promise<void>;
};

export const MatchingContext = createContext<MatchingContextType | null>(null);

export const MatchingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { show } = useOverlay();
  const value = useMatchingProvider(() => show(<DailyLimitModal />));

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
