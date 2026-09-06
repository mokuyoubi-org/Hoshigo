// RankProgressBar.tsx

import { COLORS } from "@/src/active/constants/colors";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleProp, View, ViewStyle } from "react-native";

export type AnimationType = "none" | "simple" | "transition";

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

  // 🌟 飛び級（transition）モード用オプション
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

    // 3. 昇降級・飛び級
    if (animationType === "transition") {
      const isRankChanged = rankIndexBefore !== rankIndexAfter;

      if (!isRankChanged) {
        progressAnim.setValue(beforePercent);
        Animated.timing(progressAnim, {
          toValue: afterPercent,
          duration: 1000,
          useNativeDriver: false, // ⚠️widthを変更するため常にfalseにする
        }).start(() => {
          onAnimationEnd?.();
        });
        return;
      }

      const isRankUp = rankIndexAfter > rankIndexBefore;
      const stepDiff = Math.abs(rankIndexAfter - rankIndexBefore);
      const totalSteps = stepDiff;

      const playStepAnimation = (step: number) => {
        if (step > totalSteps) {
          onAnimationEnd?.();
          return;
        }

        const stepTargetRankIndex = isRankUp
          ? rankIndexBefore + step
          : rankIndexBefore - step;

        onStepChangeRef.current?.(stepTargetRankIndex);

        if (step === 0) {
          progressAnim.setValue(beforePercent);
          Animated.timing(progressAnim, {
            toValue: isRankUp ? 100 : 0,
            duration: 500,
            useNativeDriver: false, // ⚠️widthを変更するため常にfalseにする
          }).start(() => playStepAnimation(step + 1));
        } else if (step < totalSteps) {
          progressAnim.setValue(isRankUp ? 0 : 100);
          Animated.timing(progressAnim, {
            toValue: isRankUp ? 100 : 0,
            duration: 450,
            useNativeDriver: false, // ⚠️widthを変更するため常にfalseにする
          }).start(() => playStepAnimation(step + 1));
        } else {
          progressAnim.setValue(isRankUp ? 0 : 100);
          Animated.timing(progressAnim, {
            toValue: afterPercent,
            duration: 600,
            useNativeDriver: false, // ⚠️widthを変更するため常にfalseにする
          }).start(() => {
            onAnimationEnd?.();
          });
        }
      };

      playStepAnimation(0);
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
          backgroundColor: COLORS.background,
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
