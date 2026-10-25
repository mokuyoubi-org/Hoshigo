// expo/packages/ui-atoms/src/hooks/useIsHydrated.ts

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** SSR/web初回レンダリングとクライアントhydration後の差異を吸収する */
export const useIsHydrated = () => {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
};
