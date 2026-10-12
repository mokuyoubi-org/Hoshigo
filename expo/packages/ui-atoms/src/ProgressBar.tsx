// ProgressBar.tsx
//
// 0-100の実測%を表示するプログレスバー。percentがnullのときは
// 「不確定バー」として、帯の中を左右にスライドし続けるアニメーションを表示する。

import { useEffect, useState } from "react";
import {
  Animated,
  ColorValue,
  Easing,
  LayoutChangeEvent,
  Platform,
  View,
} from "react-native";

type ProgressBarProps = {
  /** 0-100の実測%。測れないときは null で「不確定バー」になる */
  percent: number | null;
  height?: number;
  trackColor: ColorValue;
  fillColor: ColorValue;
};

export const ProgressBar = ({
  percent,
  height = 12,
  trackColor,
  fillColor,
}: ProgressBarProps) => {
  const isIndeterminate = percent === null;
  const [containerWidth, setContainerWidth] = useState(0);

  // 不確定モード用：帯の中を左右にスライドし続けるアニメーション
  // useStateの遅延初期化で、最初の1回だけ作って使い回す
  const [slideAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!isIndeterminate) return;

    slideAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();

    return () => loop.stop();
  }, [isIndeterminate, slideAnim]);

  // 枠の幅を自動で測る
  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const indicatorWidth = containerWidth * 0.4;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-indicatorWidth, containerWidth],
  });

  return (
    <View
      onLayout={handleLayout}
      style={{
        width: "100%", // 👈 親の幅いっぱいに広がる
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
};
