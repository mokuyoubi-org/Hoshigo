import { StarBackground } from "@/src/components/backGrounds/StarBackGround";
import { Avatar } from "@/src/components/goComponents/Avatar";
import LoadingModal from "@/src/components/modals/LoadingModal";
import {
  BACKGROUND,
  BRONZE,
  CHOCOLATE,
  CHOCOLATE_SUB,
  GOLD,
  SILVER,
  STRAWBERRY,
} from "@/src/constants/colors";
import { Profile } from "@/src/constants/profile";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { supabase } from "@/src/services/supabase";
import { AntDesign } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RANK_COLORS: Record<number, { color: string; label: string }> = {
  1: { color: GOLD, label: "I" },
  2: { color: SILVER, label: "II" },
  3: { color: BRONZE, label: "III" },
};

// ─── 型定義 ───────────────────────────────

// ─── RankingItem ──────────────────────
const RankingItem = ({ item, index }: { item: Profile; index: number }) => {
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

// ─── メインコンポーネント ──────────────────────────────
export default function Rankings() {
  // ── ロジック（変更なし） ──
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const fetchTopProfiles = async () => {
      const { data, error } = await supabase
        .schema("users")
        .rpc("get_top_profiles", { p_limit: 100 });

      if (error) {
        console.error(error);
      } else {
        setProfiles(data ?? []);
      }
      setLoading(false);
    };

    fetchTopProfiles();
  }, []);

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      <StarBackground />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* リスト */}
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.uid}
          renderItem={({ item, index }) => (
            <RankingItem item={item} index={index} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {loading && <LoadingModal text={t("Rankings.loading")} />}
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flex: 1,
  },

  // 背景グリッド（優しい色に）
  bgLineV: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "rgba(200,214,230,0.08)",
  },
  bgLineH: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 1,
    backgroundColor: "rgba(200,214,230,0.08)",
  },

  // ページヘッダー
  pageHeader: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.2)",
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  pageTitleAccent: {
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: STRAWBERRY,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1.5,
  },
  pageSubtitle: {
    fontSize: 11,
    color: CHOCOLATE_SUB,
    letterSpacing: 1.5,
    paddingLeft: 13,
  },

  // リスト
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },

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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAccentLine: {
    height: 2.5,
    opacity: 0.7,
    shadowOpacity: 0.6,
    shadowRadius: 4,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
});
