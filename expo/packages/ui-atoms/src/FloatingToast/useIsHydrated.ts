import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** SSR/web初回レンダリングとクライアントhydration後の差異を吸収する */
export function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}