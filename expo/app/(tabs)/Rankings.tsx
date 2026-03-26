import { FloatingToggle } from "@/src/components/FloatingToggle";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import { Profile, RankingCard } from "@/src/components/RankingCard";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { supabase } from "@/src/services/supabase";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── メインコンポーネント ──────────────────────────────
export default function Rankings() {
  // ── ロジック（変更なし） ──
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

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

  const [boardSize, setBoardSize] = useState<number>(9);

  const handleToggle = (boardSize: number) => {
    setBoardSize(boardSize);
    if (boardSize === 9) {      console.log("9路の処理"); // 9路の初期化など
    } else {
      console.log("13路の処理"); // 13路の初期化など
    }
  };
  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {/* <FloatingToggle boardSize={boardSize} onToggle={handleToggle} /> */}

      <View style={styles.content}>
        {/* リスト */}
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.uid}
          renderItem={({ item, index }) => (
            <RankingCard item={item} index={index} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <LoadingModal text={t("common.loading")} visible={loading} />
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
});
