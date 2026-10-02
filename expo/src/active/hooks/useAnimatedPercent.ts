// useAnimatedPercent.ts
// 0 から目標のパーセントまで、スーッと伸びる Animated.Value を返すフック

import { useEffect, useState } from "react";
import { Animated } from "react-native";

export function useAnimatedPercent(target: number, duration = 1000) {
  // 🐱 RankProgressBar の "simple" と同じく、0 から始める
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(Math.max(target, 0), 100),
      duration,
      useNativeDriver: false, // 🐱 width / left(%) を動かすので常に false
    }).start();
  }, [target, duration, anim]);

  return anim;
}