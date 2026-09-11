// OverlayContext.tsx
//
// 任意のJSXを画面に浮かせる/引っ込める、それだけの汎用的な仕組み。
// React標準の機能(createContext/useState)以外への依存は一切無い。

import React, { createContext, ReactNode, useContext, useState } from "react";

type OverlayContextType = {
  show: (node: ReactNode) => void;
  hide: () => void;
};

const OverlayContext = createContext<OverlayContextType | null>(null);

export const OverlayProvider = ({ children }: { children: ReactNode }) => {
  // contentは一つしか用意されていない。つまり、Providerが表示するモーダルの椅子は一つのみなのだ。
  // なので、あるモーダルが開かれると、それまで表示されていたモーダルは自動で閉じる。
  // 当然このシステムに参加するためには、もちろん、showでモーダルを表示するようにする必要がある。
  const [content, setContent] = useState<ReactNode>(null);

  const show = (node: ReactNode) => setContent(node);
  const hide = () => setContent(null);

  return (
    <OverlayContext.Provider value={{ show, hide }}>
      {content}
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
};
