// RankGauge.tsx
// ランクのゲージ（吹き出し + ゲージ + あと◯）を描くだけの部品
// 動き方は持たず、progress（0〜100）を受け取って表示する

import React, { useMemo } from "react";
import { Animated, View } from "react-native";
import { useColors } from "../hooks/useTheme";
import { AppText } from "./common/AppText";

// 🐱 吹き出しの横幅（半分の値で左にずらして、ゲージの先っぽの真上に中央揃えする）
const BUBBLE_WIDTH = 56;

export type RankGaugeProps = {
  /** ゲージの進捗率（0〜100）。数字でも Animated.Value でもOK */
  progress: number | Animated.Value;
  /** ゲージ・吹き出しの色（くみのテーマカラー） */
  color: string;
  /** ゲージの高さ（デフォルト: 24） */
  height?: number;
  /** ゲージの背景色（デフォルト: colors.background） */
  trackColor?: string;
  /** 吹き出しに表示する文字（レートなど）。渡さなければ吹き出しなし */
  bubbleText?: string | number;
  /** ゲージの下に右寄せで表示する文字（あと◯）。渡さなければなし */
  footerText?: string | null;
  /** あと◯が無いときも、その場所を空けておく（画面が揺れないようにする） */
  reserveFooterSpace?: boolean;
};

export function RankGauge({
  progress,
  color,
  height = 32,
  trackColor,
  bubbleText,
  footerText,
  reserveFooterSpace = false,
}: RankGaugeProps) {
  const colors = useColors();

  // 🐱 ゲージの幅と吹き出しの位置は、同じ1つの progress から作る（ズレようがない）
  const percent = useMemo<
    `${number}%` | Animated.AnimatedInterpolation<string>
  >(
    () =>
      typeof progress === "number"
        ? `${Math.min(Math.max(progress, 0), 100)}%`
        : progress.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
            extrapolate: "clamp",
          }),
    [progress],
  );

  return (
    <View className="w-full">
      {/* 吹き出し（現在のレート）：ゲージの先っぽの真上について動く */}
      {bubbleText !== undefined && (
        <View className="w-full h-8 relative">
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: percent,
              width: BUBBLE_WIDTH,
              marginLeft: -BUBBLE_WIDTH / 2,
              alignItems: "center",
            }}
          >
            <View
              className="rounded-lg px-2.5 py-0.5"
              style={{ backgroundColor: color }}
            >
              <AppText className="text-sm" style={{ color: colors.background }}>
                {bubbleText}
              </AppText>
            </View>
            {/* 吹き出しのしっぽ（下向きの三角） */}
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 6,
                borderRightWidth: 6,
                borderTopWidth: 6,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: color,
              }}
            />
          </Animated.View>
        </View>
      )}

      {/* ゲージ */}
      <View
        className="w-full rounded-full overflow-hidden relative"
        style={{
          height,
          backgroundColor: trackColor ?? colors.background,
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 9999,
            backgroundColor: color,
            width: percent,
          }}
        />
      </View>

      {/* あと何点か */}
      {footerText ? (
        <AppText className="text-sm text-textSub text-right mt-2">
          {footerText}
        </AppText>
      ) : reserveFooterSpace ? (
        <View className="h-5 mt-2" />
      ) : null}
    </View>
  );
}
