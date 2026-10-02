import React from "react";
import { View } from "react-native";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

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
  const colors = useColors();
  // 現在のランクの位置（インデックス）を取得
  const currentRankIndex = RANK_STEPS.findIndex((r) => r === currentRank);
  const activeIndex = currentRankIndex !== -1 ? currentRankIndex : 3;

  return (
    <View
      className="rounded-3xl border-2 p-4 gap-4"
      style={{
        backgroundColor: colors.foreground,
        borderColor: colors.backgroundDark,
      }}
    >
      {/* ヘッダー */}
      <View className="flex-row justify-between items-end">
        <View>
          <AppText className="text-sm" style={{ color: colors.textSub }}>
            到達ランク
          </AppText>
          <AppText className="text-2xl" style={{ color: colors.text }}>
            {currentRank}
            <AppText className="text-sm">（{wins}勝）</AppText>
          </AppText>
        </View>

        <View
          className="px-3 py-1.5 rounded-xl border"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.backgroundDark,
          }}
        >
          <AppText className="text-sm" style={{ color: colors.textSub }}>
            踏破した領域
          </AppText>
          <AppText className="text-sm" style={{ color: colors.green }}>
            10k 〜 {currentRank}
          </AppText>
        </View>
      </View>

      {/* 濃淡（グラデーション）ヒストグラム */}
      <View
        className="gap-3 p-3 rounded-2xl"
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-row justify-between items-center">
          <AppText className="text-sm" style={{ color: colors.text }}>
            ランク踏破度（濃淡ログ）
          </AppText>
          <AppText className="text-sm" style={{ color: colors.green }}>
            パワー上昇中
          </AppText>
        </View>

        {/* グラフのバー表示エリア */}
        <View className="flex-row items-end justify-between h-12 px-1">
          {RANK_STEPS.map((rankLabel, index) => {
            const isConquered = index <= activeIndex;
            const isCurrent = index === activeIndex;

            // 濃淡（透明度）の計算：左ほど薄く、今のランク（activeIndex）で100%濃くなる
            // 例: activeIndexが3の時 ➔ 0.25, 0.5, 0.75, 1.0 というグラデーションになる
            const opacityLevel = isConquered
              ? Math.max(0.25, (index + 1) / (activeIndex + 1))
              : 1.0;

            return (
              <View key={index} className="h-full flex-1 mx-0.5 justify-end">
                {/* 棒グラフのバー本体 */}
                <View
                  className="w-full rounded-t-sm"
                  style={{
                    // 右にいくほど高くして「積んだ感」を出す
                    height: `${30 + index * 10}%`,
                    backgroundColor: isConquered
                      ? colors.green // 踏破領域は緑
                      : colors.backgroundDark, // 未到達はグレー
                    opacity: opacityLevel, // ここで濃淡（アルファ値）をコントロール！
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
              <AppText
                key={index}
                className="text-sm text-center flex-1"
                style={{
                  color: isConquered ? colors.green : colors.textSub,
                }}
              >
                {rankLabel}
              </AppText>
            );
          })}
        </View>
      </View>
    </View>
  );
};
