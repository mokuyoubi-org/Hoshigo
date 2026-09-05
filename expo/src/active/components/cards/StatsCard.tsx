import React from "react";
import { Text, View } from "react-native";
import { COLORS } from "@/src/active/constants/colors";

type StatsCardProps = {
  wins?: number;
  draws?: number;
  losses?: number;
  higherRankStreak?: number;
  currentRank?: string;
};

// ランクの全階層リスト（左から右へのステップ）
const RANK_STEPS = ["10k", "8k", "6k", "4k", "2k", "1D", "3D", "5D+"];

export const StatsCard = ({
  wins = 12,
  currentRank = "3k",
}: StatsCardProps) => {
  // 現在のランクの位置（インデックス）を取得
  const currentRankIndex = RANK_STEPS.findIndex((r) => r === currentRank);
  const activeIndex = currentRankIndex !== -1 ? currentRankIndex : 3;

  return (
    <View
      className="rounded-3xl border-2 p-4 gap-4"
      style={{
        backgroundColor: COLORS.foreground,
        borderColor: COLORS.backgroundDark,
      }}
    >
      {/* ヘッダー */}
      <View className="flex-row justify-between items-end">
        <View>
          <Text className="text-[11px] font-bold" style={{ color: COLORS.textSub }}>
            到達ランク
          </Text>
          <Text className="text-2xl font-black" style={{ color: COLORS.text }}>
            {currentRank} <Text className="text-xs font-bold">（{wins}勝）</Text>
          </Text>
        </View>

        <View
          className="px-3 py-1.5 rounded-xl border"
          style={{
            backgroundColor: COLORS.background,
            borderColor: COLORS.backgroundDark,
          }}
        >
          <Text className="text-[10px] font-bold" style={{ color: COLORS.textSub }}>
            踏破した領域
          </Text>
          <Text className="text-xs font-black" style={{ color: COLORS.green }}>
            10k 〜 {currentRank}
          </Text>
        </View>
      </View>

      {/* 濃淡（グラデーション）ヒストグラム */}
      <View
        className="gap-3 p-3 rounded-2xl"
        style={{ backgroundColor: COLORS.background }}
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-bold" style={{ color: COLORS.text }}>
            ランク踏破度（濃淡ログ）
          </Text>
          <Text className="text-[10px] font-bold" style={{ color: COLORS.green }}>
            パワー上昇中にゃ！
          </Text>
        </View>

        {/* グラフのバー表示エリア */}
        <View className="flex-row items-end justify-between h-12 px-1">
          {RANK_STEPS.map((rankLabel, index) => {
            const isConquered = index <= activeIndex;
            const isCurrent = index === activeIndex;

            // 濃淡（透明度）の計算：左ほど薄く、今のランク（activeIndex）で100%濃くなるにゃ！
            // 例: activeIndexが3の時 ➔ 0.25, 0.5, 0.75, 1.0 というグラデーションになるにゃ
            const opacityLevel = isConquered
              ? Math.max(0.25, (index + 1) / (activeIndex + 1))
              : 1.0;

            return (
              <View key={index} className="h-full flex-1 mx-0.5 justify-end">
                {/* 棒グラフのバー本体 */}
                <View
                  className="w-full rounded-t-sm"
                  style={{
                    // 右にいくほど高くして「積んだ感」を出すにゃ
                    height: `${30 + index * 10}%`,
                    backgroundColor: isConquered
                      ? COLORS.green           // 踏破領域は緑
                      : COLORS.backgroundDark, // 未到達はグレー
                    opacity: opacityLevel,    // ここで濃淡（アルファ値）をコントロール！
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* X軸のランク刻み */}
        <View className="flex-row justify-between px-1">
          {RANK_STEPS.map((rankLabel, index) => {
            const isConquered = index <= activeIndex;
            return (
              <Text
                key={index}
                className="text-[9px] text-center flex-1 font-semibold"
                style={{
                  color: isConquered ? COLORS.green : COLORS.textSub,
                  fontWeight: index === activeIndex ? "900" : "600",
                }}
              >
                {rankLabel}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
};