// ModalShell.web.tsx

import { useSyncExternalStore } from "react";
import ReactDOM from "react-dom";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  computeModalBox,
  DEFAULT_CONTENT_PADDING,
  ModalShellProps,
} from "./common";

const emptySubscribe = () => () => {};
const useIsHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

export const ModalShell = ({
  children,
  onClose,
  size,
  style,
  backgroundColor,
  borderColor,
  overlayColor,
  contentPadding = DEFAULT_CONTENT_PADDING,
}: ModalShellProps) => {
  const isHydrated = useIsHydrated();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!isHydrated || typeof document === "undefined") {
    return null;
  }

  // 幅・高さの上限計算は native/web で共有(modalSizing.ts)。Native版と完全に同じ数値になる。
  const { width: cardWidth, maxHeight: cardMaxHeight } = computeModalBox(
    windowWidth,
    windowHeight,
    size,
  );

  return ReactDOM.createPortal(
    <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
      {/* 暗い背景部分 */}
      <div style={styles.backgroundPress as any} onClick={onClose} />

      {/* モーダル本体 ── alignItemsを指定せず、幅・高さは数値でstyle指定(Native版と同じ理由) */}
      <View
        style={[
          styles.card,
          {
            backgroundColor,
            padding: contentPadding,
            borderColor: borderColor,
          },
          {
            animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            width: cardWidth,
            maxHeight: cardMaxHeight,
          } as any,
          style,
        ]}
      >
        <style>{`
          @keyframes modalPop {
            0% {
              opacity: 0;
              transform: scale(0.9);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
        {children}
      </View>
    </View>,
    document.body,
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    display: "flex" as any,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  backgroundPress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    position: "relative",
    zIndex: 50,
    borderRadius: 20,
    borderWidth: 4,
  },
});
