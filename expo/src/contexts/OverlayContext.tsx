// OverlayContext.tsx
//
// オーバーレイ枠は一つ(showやhide関数を使ってるオーバーレイのこと)。今はどのモーダルがその枠を使ってるか？を定めるcontext。
//
// 「状態(content)を持つ場所」と「実際にcontentを描画する場所」を分けている。
// show/hideを呼ぶ側(例:MatchingProvider)より、OverlayProviderは外側にいる必要がある一方、
// contentとして表示されるモーダル(例:GameResultModal)が他のContext(例:useMatching)を
// 使えるためには、描画場所はそのProviderより内側にいる必要がある。この2つの要求が
// 矛盾する場合、OverlayOutletを好きな場所(内側)に置くことで解決する。

import { createContext, ReactNode, useContext, useState } from "react";

type OverlayContextType = {
  content: ReactNode;
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
    <OverlayContext.Provider value={{ content, show, hide }}>
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
};

// 実際にcontentを描画する係。OverlayProviderの子孫であればどこに置いてもよいが、
// contentとして表示されるモーダルが必要とする他のContext(useMatchingなど)の
// 内側に置く必要がある。
export const OverlayOutlet = () => {
  const { content } = useOverlay();
  // ここは<View>にしてはいけない
  return <>{content}</>;
};
