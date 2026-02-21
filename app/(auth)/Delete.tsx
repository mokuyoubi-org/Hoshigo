import LoadingOverlay from "@/src/components/LoadingOverlay";
import { logoutRevenueCat } from "@/src/services/RevenueCat";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UidContext } from "../../src/components/UserContexts";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/services/supabase";
import { StarBackground } from "@/src/components/StarBackGround";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";
const DANGER = "#e05c5c";

export default function Delete() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // ── ロジック（変更なし） ──
  const uid = useContext(UidContext);
  const [loading, setLoading] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onDelete = async () => {
    setLoading(true);
    if (!uid) return;
    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("uid", uid)
      .select();
    if (data) {
      await supabase.auth.signOut();
      await logoutRevenueCat();
      setLoading(false);
      router.replace("/Login");
    }
    if (error) {
      setLoading(false);
      console.log("error: ", error);
    }
  };

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      {/* 背景グリッド（優しい色に） */}
          <StarBackground />   
   

      <ScrollView
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* 戻るボタン */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("Delete.back")}</Text>
          </TouchableOpacity>

          {/* 警告アイコンエリア */}
          <Animated.View
            style={[
              styles.iconArea,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconRingOuter} />
            <View style={styles.iconRingInner} />
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>!</Text>
            </View>
          </Animated.View>

          {/* タイトル・説明 */}
          <View style={styles.textArea}>
            <Text style={styles.title}>{t("Delete.title")}</Text>
            <View style={styles.titleDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDiamond} />
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.subtitle}>{t("Delete.subtitle")}</Text>
          </View>

          {/* 注意書きカード */}
          <View style={styles.warningCard}>
            <View style={styles.warningCardAccent} />
            <Text style={styles.warningText}>{t("Delete.warning")}</Text>
          </View>

          {/* ボタン */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.8}
              onPress={onDelete}
            >
              <Text style={styles.deleteButtonText}>
                {t("Delete.deleteButton")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>{t("Delete.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {loading && <LoadingOverlay text={t("Delete.loading")} />}
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
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

  scrollView: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
    flex: 1,
  },

  // 戻るボタン
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 40,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },

  // 警告アイコン
  iconArea: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    height: 120,
  },
  iconRingOuter: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    borderColor: "rgba(224,92,92,0.2)",
  },
  iconRingInner: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: "rgba(224,92,92,0.15)",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffffff",
    borderWidth: 2.5,
    borderColor: "rgba(224,92,92,0.5)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: DANGER,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  iconText: {
    fontSize: 40,
    fontWeight: "800",
    color: DANGER,
    lineHeight: 48,
  },

  // タイトル・説明
  textArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1,
    marginBottom: 16,
  },
  titleDivider: {
    flexDirection: "row",
    alignItems: "center",
    width: 160,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "rgba(224,92,92,0.25)",
  },
  dividerDiamond: {
    width: 5,
    height: 5,
    backgroundColor: DANGER,
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 8,
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 14,
    color: CHOCOLATE_SUB,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.3,
  },

  // 注意書きカード
  warningCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(224,92,92,0.3)",
    overflow: "hidden",
    marginBottom: 36,
    shadowColor: DANGER,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  warningCardAccent: {
    height: 2.5,
    backgroundColor: DANGER,
    opacity: 0.6,
  },
  warningText: {
    fontSize: 13,
    color: DANGER,
    lineHeight: 20,
    letterSpacing: 0.3,
    padding: 18,
    fontWeight: "600",
  },

  // ボタン
  buttons: {
    gap: 12,
  },
  deleteButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(224,92,92,0.1)",
    borderWidth: 2,
    borderColor: "rgba(224,92,92,0.5)",
    shadowColor: DANGER,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: DANGER,
    letterSpacing: 0.5,
  },
  cancelButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
});