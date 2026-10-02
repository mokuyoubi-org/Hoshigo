// RankProgressBar.tsx

import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleProp, View, ViewStyle } from "react-native";
import { useColors } from "../hooks/useTheme";

export type AnimationType = "none" | "simple";

export type RankProgressBarProps = {
  /** ゲージの進捗率（0〜100） */
  progressPercent: number;
  /** ゲージの色（くみのテーマカラー） */
  color: string;
  /** アニメーションのタイプ */
  animationType?: AnimationType;
  /** ゲージの高さ（デフォルト: 24） */
  height?: number;
  /** 外枠の追加スタイル（オプション） */
  style?: StyleProp<ViewStyle>;

  /** 遷移前の進捗率 (0〜100) */
  beforePercent?: number;
  /** 遷移後の進捗率 (0〜100) */
  afterPercent?: number;
  /** 遷移前のグループIndex */
  rankIndexBefore?: number;
  /** 遷移後のグループIndex */
  rankIndexAfter?: number;
  /** 各ステップ（段位が切り替わるタイミング）で呼ばれるコールバック（くみ名の更新用） */
  onStepChange?: (currentStepIndex: number) => void;
  /** 全アニメーション完了時に呼ばれるコールバック */
  onAnimationEnd?: () => void;
};

export function RankProgressBar({
  progressPercent,
  color,
  animationType = "simple",
  height = 24,
  style,
  beforePercent = 0,
  afterPercent = 0,
  rankIndexBefore = 0,
  rankIndexAfter = 0,
  onStepChange,
  onAnimationEnd,
}: RankProgressBarProps) {
  const colors = useColors();
  const [progressAnim] = useState(() => new Animated.Value(0));

  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  });

  useEffect(() => {
    // 1. アニメーションなし
    if (animationType === "none") {
      progressAnim.setValue(progressPercent);
      return;
    }

    // 2. シンプルな伸び縮み
    if (animationType === "simple") {
      Animated.timing(progressAnim, {
        toValue: progressPercent,
        duration: 1000,
        useNativeDriver: false, // ⚠️widthを変更するため常にfalseにする
      }).start();
      return;
    }

  }, [
    progressPercent,
    animationType,
    rankIndexBefore,
    rankIndexAfter,
    beforePercent,
    afterPercent,
    progressAnim,
    onAnimationEnd,
  ]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      className="w-full rounded-full overflow-hidden relative"
      style={[
        {
          height,
          backgroundColor: colors.background,
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: "100%",
          borderRadius: 9999,
          backgroundColor: color,
          width: animatedWidth,
        }}
      />
    </View>
  );
}
