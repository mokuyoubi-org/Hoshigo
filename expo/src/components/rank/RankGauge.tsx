// RankGauge.tsx
// ランクのゲージ（吹き出し + ゲージ + あと◯）を描くだけの部品
// 動き方は持たず、progress（0〜100）を受け取って表示する

import { useColors } from "@/src/hooks/common/useTheme";
import { useMemo } from "react";
import { Animated, View } from "react-native";
import { Bubble } from "ui-atoms";
import { MyText } from "../common/MyText";

// 🐱 吹き出しの横幅（半分の値で左にずらして、ゲージの先っぽの真上に中央揃えする）
const BUBBLE_WIDTH = 56;

type Props = {
  /** ゲージの進捗率（0〜100）。数字でも Animated.Value でもOK */
  progress: number | Animated.Value;
  /** ゲージ・吹き出しの色（くみのテーマカラー） */
  color: string;
  /** ゲージの高さ（デフォルト: 24） */
  height?: number;
  /** ゲージの背景色（デフォルト: colors.foreground） */
  trackColor?: string;
  /** 吹き出しに表示する文字（レートなど）。渡さなければ吹き出しなし */
  bubbleText?: string | number;
  /** ゲージの下に右寄せで表示する文字（あと◯）。渡さなければなし */
  footerText?: string | null;
  /** ゲージの下に左寄せで表示する説明（ジャイアントキリングボーナスなど）。渡さなければなし */
  footerLeftText?: string | null;
  /** あと◯が無いときも、その場所を空けておく（画面が揺れないようにする） */
  reserveFooterSpace?: boolean;
};

export const RankGauge = ({
  progress,
  color,
  height = 32,
  trackColor,
  bubbleText,
  footerText,
  footerLeftText,
  reserveFooterSpace = false,
}: Props) => {
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
        <View className="w-full h-8 relative z-10">
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
            {/* 枠線も背景と同じ色にして、くみのテーマカラーでベタ塗りにする */}
            <Bubble
              text={bubbleText}
              backgroundColor={color}
              borderColor={color}
              textColor={colors.foreground}
              tailDirection="down"
              TextComponent={MyText}
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
      {/* ゲージの下の段：左に説明、右にあと何点か */}
      {footerLeftText || footerText ? (
        <View className="flex-row items-center mt-2">
          <MyText className="flex-1 text-sm text-left mr-2" style={{ color }}>
            {footerLeftText}
          </MyText>
          <MyText className="text-sm text-textSub text-right ml-auto">
            {footerText}
          </MyText>
        </View>
      ) : reserveFooterSpace ? (
        <View className="h-5 mt-2" />
      ) : null}
    </View>
  );
};
