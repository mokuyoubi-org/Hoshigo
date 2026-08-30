// ModalShell.web.tsx
import React, { useSyncExternalStore } from "react";
import ReactDOM from "react-dom";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { ModalShellProps } from "./ModalShell";
import { computeModalBox } from "./modalSizing";

const emptySubscribe = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ModalShell({
  children,
  onClose,
  size = "md",
  style,
  backgroundColor = "#f0f5f9", // background
}: ModalShellProps) {
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
    <View style={styles.overlay}>
      {/* 暗い背景部分 */}
      <div style={styles.backgroundPress as any} onClick={onClose} />

      {/* モーダル本体 ── alignItemsを指定せず、幅・高さは数値でstyle指定(Native版と同じ理由) */}
      <View
        style={[
          styles.card,
          { backgroundColor },
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
}

const styles = StyleSheet.create({
  overlay: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    display: "flex" as any,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000080", // overlay
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
    zIndex: 10,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#e1e8ed", // backgroundDark
    padding: 24,
  },
});
