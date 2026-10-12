// ModalShell.native.tsx

import React, { useEffect } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useAnimatedValue,
  useWindowDimensions,
  View,
} from "react-native";
import {
  computeModalBox,
  DEFAULT_CONTENT_PADDING,
  ModalShellProps,
} from "./common";

export const ModalShell = ({
  children,
  onClose,
  size,
  style,
  dismissKeyboardOnPress = true,
  backgroundColor,
  borderColor,
  overlayColor,
  contentPadding = DEFAULT_CONTENT_PADDING,
}: ModalShellProps) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const fadeAnim = useAnimatedValue(0);
  const scaleAnim = useAnimatedValue(0.9);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== "web",
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
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim, backgroundColor: overlayColor },
      ]}
    >
      {/* 暗い背景部分 */}
      <Pressable
        style={styles.backgroundPress}
        onPress={handleBackgroundPress}
      />

      {/* モーダル本体 ── ここが「見た目(色/枠/角丸/アニメ/サイズ上限)」だけの責務。
          alignItemsを指定していないので、中身はRN標準どおり幅いっぱいに伸びる。 */}
      <Animated.View
        style={[
          styles.card,
          { backgroundColor, padding: contentPadding, borderColor },
          { transform: [{ scale: scaleAnim }] },
          { width: cardWidth, maxHeight: cardMaxHeight },
          style,
        ]}
      >
        {dismissKeyboardOnPress ? (
          <Pressable
            style={styles.fullWidth}
            onPress={() => Keyboard.dismiss()}
          >
            {children}
          </Pressable>
        ) : (
          <View style={styles.fullWidth}>{children}</View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  },
  fullWidth: {
    width: "100%",
  },
});
