// ModalShell.native.tsx
import React, { useEffect } from "react";
import {
  Animated,
  Keyboard,
  Pressable,
  StyleProp,
  StyleSheet,
  useAnimatedValue,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { computeModalBox, ModalSize } from "./modalSizing";

type ModalShellProps = {
  children: React.ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  dismissKeyboardOnPress?: boolean;
  backgroundColor?: string;
  size?: ModalSize;
};

export function ModalShell({
  children,
  onClose,
  size = "md",
  style,
  dismissKeyboardOnPress = true,
  backgroundColor = "#f0f5f9", // background
}: ModalShellProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const fadeAnim = useAnimatedValue(0);
  const scaleAnim = useAnimatedValue(0.9);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleBackgroundPress = () => {
    Keyboard.dismiss();
    onClose?.();
  };

  // 幅・高さの上限計算は native/web で共有(modalSizing.ts)。
  const { width: cardWidth, maxHeight: cardMaxHeight } = computeModalBox(
    windowWidth,
    windowHeight,
    size,
  );

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* 暗い背景部分 */}
      <Pressable style={styles.backgroundPress} onPress={handleBackgroundPress} />

      {/* モーダル本体 ── ここが「見た目(色/枠/角丸/アニメ/サイズ上限)」だけの責務。
          alignItemsを指定していないので、中身はRN標準どおり幅いっぱいに伸びる。 */}
      <Animated.View
        style={[
          styles.card,
          { backgroundColor },
          { transform: [{ scale: scaleAnim }] },
          { width: cardWidth, maxHeight: cardMaxHeight },
          style,
        ]}
      >
        {dismissKeyboardOnPress ? (
          <Pressable style={styles.fullWidth} onPress={() => Keyboard.dismiss()}>
            {children}
          </Pressable>
        ) : (
          <View style={styles.fullWidth}>{children}</View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000080", // overlay
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
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
    borderColor: "#e1e8ed", // backgroundDark
    padding: 16,
  },
  fullWidth: {
    width: "100%",
  },
});