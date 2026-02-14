import { DailyLimitModal } from "@/src/components/DailyLimitModal";
import { InfoModal } from "@/src/components/InfoModal";
import LoadingOverlay from "@/src/components/LoadingOverlay";
import LoginNeededModal from "@/src/components/LoginNeededModal";
import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  IsPremiumContext,
  UidContext,
} from "../../src/components/UserContexts";
import { useTheme } from "../../src/lib/useTheme";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const [isInfoModalVisible, setIsModalVisible] = useState(false);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const uid = useContext(UidContext);
  const isPremium = useContext(IsPremiumContext);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const startMatching = async () => {
    if (!uid) {
      setIsLoginModalVisible(true);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("daily_play_count")
        .eq("uid", uid)
        .single();
      setLoading(false);

      if (error) {
        console.error("Error fetching daily play count:", error);
        return;
      }

      if (data.daily_play_count >= 10 && !isPremium) {
        setIsDailyLimitReached(true);
        return;
      }

      router.replace("/Matching");
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const openInfoModal = () => {
    setIsModalVisible(true);
  };

  const closeInfoModal = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar style="auto" />

        <View style={styles.content}>
          <View style={styles.top}>
            {/* はてなマークボタン */}
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: colors.button }]}
              onPress={openInfoModal}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.infoButtonText, { color: colors.background }]}
              >
                ?
              </Text>
            </TouchableOpacity>
          </View>

          {/* メインコンテンツ */}
          <View style={styles.mainContent}>
            {/* 対局するボタン */}

            <View style={styles.matchingButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.matchingButton,
                  { backgroundColor: colors.button },
                ]}
                activeOpacity={0.8}
                onPress={startMatching}
              >
                <Text
                  style={[
                    styles.matchingButtonText,
                    { color: colors.background },
                  ]}
                >
                  {t("Home.startMatch")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* ローディングオーバーレイ */}
        {loading && <LoadingOverlay text={t("Home.loading")} />}
      </SafeAreaView>

      {/* ログインモーダル */}
      <LoginNeededModal
        visible={isLoginModalVisible}
        onClose={() => setIsLoginModalVisible(false)}
        message={t("Home.loginRequired")}
      />

      {/* 情報モーダル */}
      <InfoModal
        visible={isInfoModalVisible}
        onClose={closeInfoModal}
        colors={colors}
      />

      {/* 対局制限モーダル */}
      <DailyLimitModal
        visible={isDailyLimitReached}
        onClose={() => setIsDailyLimitReached(false)}
        colors={colors}
        dailyLimit={10}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  top: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignContent: "flex-start",
    paddingTop: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
  },
  mainContent: {
    height: "100%",

    width: "100%",
    alignItems: "center",
    flexDirection: "column",
  },
  matchingButtonContainer: {
    flexDirection: "column",
    justifyContent: "center",

    flex: 2,
  },
  matchingButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  matchingButtonText: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoButtonText: {
    fontSize: 24,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 32,
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
  limitModalContent: {
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  limitModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  limitModalIconText: {
    fontSize: 40,
  },
  limitModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  limitModalMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  limitModalButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  limitModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});