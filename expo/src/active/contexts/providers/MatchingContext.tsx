// MatchingContext.tsx
// Contextの定義と、Providerの箱だけ。中身のロジックは useMatchingProvider に集約されている。

import { BoardSize } from "go-core";
import React, { createContext, useContext } from "react";
import { useMatchingProvider } from "../../hooks/useMatchingProvider";

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
  const value = useMatchingProvider();

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