// RankingCard.tsx

import { MixedText } from "@/src/components/common/MixedText";
import { MyText } from "@/src/components/common/MyText";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { getRankInfo } from "@/src/logics/rank/rankLogics";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Animated, Platform, TouchableOpacity, View } from "react-native";
import { Avatar } from "../avatar/Avatar";

// ─── 型定義 ───────────────────────────────
export type RankingsProfile = {
  username: string;
  rating: number;
  icon_index: number;
  is_authenticated?: boolean; // 🐱 認証済みフラグを追加！
  is_premium?: boolean;
};

// ─── RankingCard ──────────────────────
export const RankingCard = ({
  item,
  index,
}: {
  item: RankingsProfile;
  index: number;
}) => {
  const colors = useColors();
  const RANK_COLORS: Record<number, { color: string }> = {
    1: { color: colors.gold },
    2: { color: colors.silver },
    3: { color: colors.bronze },
  };
  const t = useTranslation();
  const rank = index + 1;
  const rankMeta = RANK_COLORS[rank];
  const isTop3 = rank <= 3;

  // 🌟 自分かどうかを判定する
  const { username } = useProfile();
  const isMe = item.username === username;

  // 🌟 rank_index から表示用ラベルを取得する
  const rankLabel = getRankInfo(item.rating, t).name;

  // useMemo で Animated.Value を安全に生成・保持する
  const fadeIn = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      delay: index * 50, // 順番にフェードイン
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [fadeIn, index]);

  return (
    <Animated.View style={{ opacity: fadeIn /* このopacityは許可 */ }}>
      <TouchableOpacity
        activeOpacity={1}
        className={`bg-foreground rounded-xl overflow-hidden ${
          isMe
            ? "border-4 border-primary" // 自分：太い枠線
            : "border-2 border-backgroundStrong" // みんな：普通の枠線
        }`}
      >
        <View className="flex-row items-center px-2 py-4">
          {/* 順位 */}
          {isTop3 ? (
            <View className="w-12 h-12 justify-center items-center">
              <AntDesign name="crown" size={24} color={rankMeta.color} />
            </View>
          ) : (
            <View className="w-12 h-12 justify-center items-center">
              <MyText className="text-base color-textSub">{rank}</MyText>
            </View>
          )}

          {/* アバター */}
          <Avatar
            rankIndex={getRankInfo(item.rating, t).index}
            iconIndex={item.icon_index}
            size={50}
          />

          <View className="px-2" />

          {/* 名前 + 認証バッジ */}
          <View className="flex-1 flex-row items-center gap-1">
            <MixedText
              className={`text-base color-text ${isTop3 ? "color-text" : ""}`}
              numberOfLines={1}
            >
              {item.username}
            </MixedText>

            {/* 🐱 認証済みユーザーなら公式バッジを表示する */}
            {item.is_authenticated && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color={item.is_premium ? colors.gold : colors.primary}
              />
            )}
          </View>

          {/* 🌟 右側に表示するランク*/}
          <View className="ml-2 mr-2 px-2 py-1 bg-background rounded-full">
            <MyText className="text-sm color-textSub">{rankLabel}</MyText>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
