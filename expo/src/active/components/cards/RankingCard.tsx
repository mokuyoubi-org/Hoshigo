// RankingCard.tsx

import { Avatar } from "@/src/active/components/go/Avatar";
import { COLORS } from "@/src/active/constants/colors";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"; // 🐱 MaterialCommunityIcons を追加！
import React, { useEffect, useMemo } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "../../language/i18n";

const RANK_COLORS: Record<number, { color: string }> = {
  1: { color: COLORS.gold },
  2: { color: COLORS.silver },
  3: { color: COLORS.bronze },
};

// 🌟 rank_index (0~17) を表示用ラベルに変換する表
const RANK_LABELS: string[] = [
  "10k",
  "9k",
  "8k",
  "7k",
  "6k",
  "5k",
  "4k",
  "3k",
  "2k",
  "1k", // 0~9
  "1D",
  "2D",
  "3D",
  "4D",
  "5D",
  "6D",
  "7D",
  "8D", // 10~17
];

// ─── 型定義 ───────────────────────────────
export type Profile = {
  username: string;
  points: number;
  icon_index: number;
  is_authenticated?: boolean; // 🐱 認証済みフラグを追加！
};

// ─── RankingCard ──────────────────────
export const RankingCard = ({
  item,
  index,
}: {
  item: Profile;
  index: number;
}) => {
  const t = useTranslation();
  const rank = index + 1;
  const rankMeta = RANK_COLORS[rank];
  const isTop3 = rank <= 3;

  // 🌟 自分かどうかを判定する
  const { username } = useProfile();
  const isMe = item.username === username;

  // 🌟 rank_index から表示用ラベルを取得する（無効な数値のときは "-"）
  const rankLabel = RANK_LABELS[getRankInfo(item.points, t).index] ?? "-";

  // useMemo で Animated.Value を安全に生成・保持する
  const fadeIn = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      delay: index * 50, // 順番にフェードイン
      useNativeDriver: true,
    }).start();
  }, [fadeIn, index]);

  return (
    <Animated.View style={{ opacity: fadeIn }}>
      <TouchableOpacity
        activeOpacity={1}
        className={`bg-foreground rounded-[16px] overflow-hidden ${
          isMe
            ? "border-[3px] border-primary" // 自分：太い枠線
            : "border-[2px] border-backgroundDark" // みんな：普通の枠線
        }`}
      >
        <View className="flex-row items-center px-2 py-[14px]">
          {/* 順位 */}
          {isTop3 ? (
            <View className="w-[42px] h-[42px] justify-center items-center mr-[12px]">
              <AntDesign name="crown" size={24} color={rankMeta.color} />
            </View>
          ) : (
            <View className="w-[42px] h-[42px] justify-center items-center mr-[12px]">
              <Text className="text-[16px] font-bold color-textSub tracking-[0.5px] opacity-60">
                {rank}
              </Text>
            </View>
          )}

          {/* アバター */}
          <Avatar
            rankIndex={getRankInfo(item.points, t).index}
            iconIndex={item.icon_index}
            size={50}
          />

          <View className="px-2" />

          {/* 名前 + 認証バッジ */}
          <View className="flex-1 flex-row items-center gap-1">
            <Text
              className={`text-[15px] font-bold color-text tracking-[0.3px] ${
                isTop3 ? "color-text font-extrabold" : ""
              }`}
              numberOfLines={1}
            >
              {item.username}
            </Text>

            {/* 🐱 認証済みユーザーなら公式バッジを表示するにゃ！ */}
            {item.is_authenticated && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color={COLORS.primary}
              />
            )}
          </View>

          {/* 🌟 右側に表示するランク*/}
          <View className="ml-2 mr-2 px-2.5 py-1 bg-backgroundDark/50 rounded-full">
            <Text className="text-[14px] font-bold color-textSub">
              {rankLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
