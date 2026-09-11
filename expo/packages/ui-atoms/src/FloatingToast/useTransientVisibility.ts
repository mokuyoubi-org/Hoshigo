// useTransientVisibility.ts

import { useEffect, useState } from "react";
import { Animated, Platform } from "react-native";

/**
 * activeがtrue→falseになっても、退場アニメが終わるまでshouldRenderをtrueに保つ。
 * contentはactiveの間だけ追従し、退場中はフリーズされる。
 *
 * 注意: contentは呼び出し側でuseMemoして参照を安定させること
 * （このhookは参照の変化でしか「更新すべきか」を判定しないため）
 */
export function useTransientVisibility<T>(active: boolean, content: T) {
  const [isMounted, setIsMounted] = useState(active);
  const shouldRender = active || isMounted;

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(20));
  const [frozenContent, setFrozenContent] = useState(content);

  if (active && !isMounted) {
    setIsMounted(true);
  }
  if (active && frozenContent !== content) {
    setFrozenContent(content);
  }

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    } else if (isMounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 250,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [active, isMounted, fadeAnim, slideAnim]);

  return { shouldRender, fadeAnim, slideAnim, content: frozenContent };
}