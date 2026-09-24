// MatchingContext.tsx
// Contextの定義と、Providerの箱だけ。中身のロジックは useMatchingProvider に集約されている。
// 「b18が要る」と分かった時にモーダルを出す役目(UI関心事)はこのコンポーネント層が担う。
// フェーズによる出し分け(未DL/DL中/ウォームアップ中/自動クローズ)は
// AIDownloadModal自身がgetModelStatusを見て行うので、ここでは常に同じ
// モーダルを出すだけでよい。

import { BoardSize } from "go-core";
import React, { createContext, useContext } from "react";
import { AIDownloadModal } from "../components/modals/AIDownloadModal";
import { useMatchingProvider } from "../hooks/useMatchingProvider";
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
  const value = useMatchingProvider(() => {
    show(<AIDownloadModal from="matching" />);
  });

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
