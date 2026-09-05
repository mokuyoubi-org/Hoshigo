// ProgressBar.tsx

import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

type Props = {
  /** 0-100の実測%。測れないときは null で「不確定バー」になる */
  percent: number | null;
  width?: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
};

export function ProgressBar({
  percent,
  width = 180,
  height = 6,
  trackColor = "#e5e9ec",
  fillColor = "#b4c9db",
}: Props) {
  const isIndeterminate = percent === null;

  // 不確定モード用：帯の中を左右にスライドし続けるアニメーション
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isIndeterminate) return;

    slideAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [isIndeterminate, slideAnim]);

  // インジケーター自体の幅（トラック幅の40%くらい）が左端〜右端を往復する
  const indicatorWidth = width * 0.4;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-indicatorWidth, width],
  });

  return (
    <View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: "hidden",
      }}
    >
      {isIndeterminate ? (
        <Animated.View
          style={{
            width: indicatorWidth,
            height: "100%",
            borderRadius: height / 2,
            backgroundColor: fillColor,
            transform: [{ translateX }],
          }}
        />
      ) : (
        <View
          style={{
            width: `${Math.max(0, Math.min(100, percent!))}%`,
            height: "100%",
            backgroundColor: fillColor,
          }}
        />
      )}
    </View>
  );
}