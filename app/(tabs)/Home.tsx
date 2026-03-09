import { StarBackground } from "@/src/components/backGrounds/StarBackGround";
import { DailyLimitModal } from "@/src/components/modals/DailyLimitModal";
import { InfoModal } from "@/src/components/modals/InfoModal";
import LoadingModal from "@/src/components/modals/LoadingModal";
import LoginNeededModal from "@/src/components/modals/LoginNeededModal";
import { MaintenanceModal } from "@/src/components/modals/MaintenanceModal";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import {
  MaintenanceContext,
  MaintenanceMessageContext,
} from "@/src/contexts/AppContexts";
import { IsPremiumContext, UidContext } from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { supabase } from "@/src/services/supabase";
import { lang, t } from "@/src/services/translations";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── メイン ───────────────────────────────────────────
export default function Home() {
  const [isInfoModalVisible, setIsModalVisible] = useState(false);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const uid = useContext(UidContext);
  const isPremium = useContext(IsPremiumContext);
  const maintenance = useContext(MaintenanceContext);
  const maintenanceMessage = useContext(MaintenanceMessageContext);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const startMatching = async () => {
    if (!uid) {
      setIsLoginModalVisible(true);
      return;
    }
    try {
      if (!isPremium) {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("daily_play_count")
          .eq("uid", uid)
          .single();
        setLoading(false);
        if (error) {
          console.error(error);
          return;
        }
        if (data.daily_play_count >= 10) {
          setIsDailyLimitReached(true);
          return;
        }
      }
      router.replace("/Matching");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.94,
      friction: 8,
      useNativeDriver: true,
    }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      {/* 🆕 メンテナンスオーバーレイ（最前面） */}
      {maintenance && <MaintenanceModal message={maintenanceMessage} />}

      <StarBackground />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoButtonText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* タイトル */}
        <View style={styles.titleArea}>
          <Text style={styles.tagline}>{t("Home.tagline")}</Text>
          <Text style={styles.appTitle}>{t("Home.titleMain")}</Text>
          <Text style={lang === "en" ? styles.appMotto : styles.appRomaji}>
            {t("Home.titleReading")}
          </Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>
        </View>

        {/* メインボタン */}
        <View style={styles.buttonArea}>
          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={startMatching}
            activeOpacity={1}
          >
            <View style={styles.glowWrapper}>
              <Animated.View
                style={[
                  styles.matchButton,
                  {
                    transform: [{ scale: pressScale }],
                  },
                ]}
              >
                <Text style={styles.btnLabel}>{t("Home.tap")}</Text>
                <Text style={styles.btnText}>{t("Home.startMatch")}</Text>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {loading && <LoadingModal text={t("Home.loading")} />}
      <LoginNeededModal
        visible={isLoginModalVisible}
        onClose={() => setIsLoginModalVisible(false)}
        message={t("Home.loginRequired")}
      />
      <InfoModal
        visible={isInfoModalVisible}
        onClose={() => setIsModalVisible(false)}
        colors={colors}
      />
      <DailyLimitModal
        visible={isDailyLimitReached}
        onClose={() => setIsDailyLimitReached(false)}
        colors={colors}
        dailyLimit={10}
      />
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
    paddingHorizontal: 28,
  },

  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 8,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: STRAWBERRY,
    backgroundColor: "rgba(232,164,184,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoButtonText: {
    fontSize: 17,
    color: STRAWBERRY,
  },

  titleArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tagline: {
    fontSize: 10,
    letterSpacing: 5,
    color: CHOCOLATE_SUB,
    marginBottom: 14,
  },
  appTitle: {
    fontSize: 68,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 10,
  },
  appRomaji: {
    fontSize: 11,
    letterSpacing: 6,
    color: CHOCOLATE_SUB,
    marginTop: 8,
  },
  appMotto: {
    fontSize: 11,
    letterSpacing: 4,
    color: CHOCOLATE_SUB,
    marginTop: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: 160,
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(232,164,184,0.35)",
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STRAWBERRY,
    marginHorizontal: 10,
    opacity: 0.7,
  },

  buttonArea: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },

  matchButton: {
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: "#fff8fa",
    borderWidth: 8,
    borderColor: STRAWBERRY,
    justifyContent: "center",
    alignItems: "center",

    // ここが浮遊ポイント
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 8 }, // 下にドーン
    shadowOpacity: 0.45,
    shadowRadius: 25,
    elevation: 20, // Androidはこれ大きく
  },

  glowWrapper: {
    borderRadius: 100,
    shadowColor: "white",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 30,
  },
  btnLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: CHOCOLATE_SUB,
    marginBottom: 6,
  },
  btnText: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 2,
  },

  statsArea: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(232,164,184,0.2)",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 22,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: CHOCOLATE,
  },
  statLabel: {
    fontSize: 10,
    color: CHOCOLATE_SUB,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(232,164,184,0.3)",
  },
});
