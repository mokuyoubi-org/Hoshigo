import { Avatar } from "@/src/components/GoComponents/Avatar";
import {
  BRONZE,
  CHOCOLATE,
  CHOCOLATE_SUB,
  GOLD,
  SILVER,
} from "@/src/constants/colors";
import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const RANK_COLORS: Record<number, { color: string; label: string }> = {
  1: { color: GOLD, label: "I" },
  2: { color: SILVER, label: "II" },
  3: { color: BRONZE, label: "III" },
};

// ─── 型定義 ───────────────────────────────
export type Profile = {
  uid: string;
  displayname: string;
  points: number;
  gumi_index: number;
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
            gumiIndex={item.gumi_index}
            iconIndex={item.icon_index}
            size={50}
          />

          <View style={{ paddingHorizontal: 8 }} />

          {/* 名前 */}
          <View style={styles.infoContainer}>
            <Text
              style={[
                styles.name,
                isTop3 && { color: CHOCOLATE, fontWeight: "800" },
              ]}
              numberOfLines={1}
            >
              {item.displayname}
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
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
  },
  cardAccentLine: {
    height: 2.5,
    opacity: 0.7,
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
  topRankText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
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
    color: CHOCOLATE_SUB,
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
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  pointsText: {
    fontSize: 12,
    color: CHOCOLATE_SUB,
    letterSpacing: 0.5,
    fontWeight: "600",
  },

  // 上位3の右端グロー
  rankGlowLine: {
    width: 3.5,
    height: 36,
    borderRadius: 2,
    opacity: 0.6,
  },
});
