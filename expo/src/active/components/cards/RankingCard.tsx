import { Avatar } from "@/src/active/components/go/Avatar";
import { COLORS } from "@/src/active/constants/colors";
import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const RANK_COLORS: Record<number, { color: string }> = {
  1: { color: COLORS.gold },
  2: { color: COLORS.silver },
  3: { color: COLORS.bronze },
};

// ─── 型定義 ───────────────────────────────
export type Profile = {
  uid: string;
  username: string;
  points: number;
  group_index: number;
  icon_index: number;
};
// ─── RankingCard ──────────────────────
export const RankingCard = ({
  item,
  index,
}: {
  item: Profile;
  index: number;
}) => {
  const rank = index + 1;
  const rankMeta = RANK_COLORS[rank];
  const isTop3 = rank <= 3;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      delay: index * 50, // 順番にフェードイン
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.itemContainer, { opacity: fadeIn }]}>
      <View style={[styles.card]}>
        <View style={styles.cardContent}>
          {/* 順位 */}
          {isTop3 ? (
            <View style={[styles.topRankBadge]}>
              <AntDesign name="crown" size={24} color={rankMeta.color} />
            </View>
          ) : (
            <View style={styles.normalRank}>
              <Text style={styles.normalRankText}>{rank}</Text>
            </View>
          )}

          {/* アバター */}
          <Avatar
            groupIndex={item.group_index}
            iconIndex={item.icon_index}
            size={50}
          />

          <View style={{ paddingHorizontal: 8 }} />

          {/* 名前 */}
          <View style={styles.infoContainer}>
            <Text
              style={[
                styles.name,
                isTop3 && { color: COLORS.text, fontWeight: "800" },
              ]}
              numberOfLines={1}
            >
              {item.username}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  // アイテムコンテナ
  itemContainer: {
    // アニメーション用
  },

  // カード
  card: {
    backgroundColor: COLORS.foreground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  // 上位3バッジ
  topRankBadge: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  // 通常順位
  normalRank: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  normalRankText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSub,
    letterSpacing: 0.5,
    opacity: 0.6,
  },

  // 名前・ポイント
  infoContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
});
