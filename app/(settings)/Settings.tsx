import LoginNeededModal from "@/src/components/LoginNeededModal";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomPaywallScreen from "../(premium)/CustomPayWall";
// import CustomerCenterScreen from "./_CustomerCenter";
import CustomCustomerCenterScreen from "../(premium)/CustomCustomerCenter";

import { logoutRevenueCat } from "@/src/services/RevenueCat";
import LoadingOverlay from "../../src/components/LoadingOverlay";
import { EmailContext, UidContext } from "../../src/components/UserContexts";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/services/supabase";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const email = useContext<string | null>(EmailContext);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const uid = useContext(UidContext);
  const { isPro } = useRevenueCat();
  const { colors } = useTheme();

  // 🆕 Paywall/CustomerCenter用のModal state
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    await logoutRevenueCat(); // ← これを追加

    setLoading(false);
  };

  const onDelete = async () => {
    if (!uid) {
      setIsLoginModalVisible(true);
    } else {
      router.push("/Delete");
    }
  };

  // 🆕 Premium管理
  const onPremium = () => {
    if (!uid) {
      setIsLoginModalVisible(true);
    } else {
      if (isPro) {
        // Pro会員ならCustomer Centerを表示
        setShowCustomerCenter(true);
      } else {
        // 無料会員ならPaywallを表示
        setShowPaywall(true);
      }
    }
  };

  const onDesignChange = () => {
    router.push("/Design");
  };

  // const onLanguageChange = () => {
  //   router.push("/Language");
  // };

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("URLを開けませんでした:", err),
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/MyPage")}
            >
              <Text style={[styles.backButtonText, { color: colors.active }]}>
                ‹ {t("Settings.back")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("Settings.title")}
            </Text>
          </View>

          {/* アカウント情報セクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("Settings.accountInfo")}
            </Text>

            <View
              style={[
                styles.infoItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>
                {t("Settings.email")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {email || t("Settings.notSet")}
              </Text>
            </View>
          </View>

          {/* プランセクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("Settings.plan")}
            </Text>

            <TouchableOpacity
              style={[
                styles.planItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              onPress={onPremium}
            >
              <View style={styles.planContent}>
                <Text style={[styles.planLabel, { color: colors.subtext }]}>
                  {t("Settings.currentPlan")}
                </Text>
                <Text style={[styles.planValue, { color: colors.text }]}>
                  {isPro
                    ? "✨ " + t("Settings.premiumPlan")
                    : t("Settings.startPlan")}
                </Text>
              </View>
              <Text style={[styles.menuItemArrow, { color: colors.subtext }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* カスタマイズセクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("Settings.customize")}
            </Text>

            <View
              style={[
                styles.infoItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>
                {t("Settings.language")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {{ zh: "中文", ko: "한국어", ja: "日本語", en: "English" }[
                  i18n.language.split("-")[0]
                ] ?? i18n.language}
              </Text>
            </View>
          </View>

          {/* 情報セクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("Settings.information")}
            </Text>

            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => openURL("https://mokuyoubi.org/privacy")}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {t("Settings.privacyPolicy")}
              </Text>
              <Text style={[styles.menuItemArrow, { color: colors.subtext }]}>
                ›
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => openURL("https://mokuyoubi.org/terms")}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {t("Settings.termsOfService")}
              </Text>
              <Text style={[styles.menuItemArrow, { color: colors.subtext }]}>
                ›
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => openURL("https://mokuyoubi.org/license")}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {t("Settings.license")}
              </Text>
              <Text style={[styles.menuItemArrow, { color: colors.subtext }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* アカウント操作セクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("Settings.accountActions")}
            </Text>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
                loading && styles.logoutButtonDisabled,
              ]}
              disabled={loading}
              activeOpacity={0.8}
              onPress={onLogout}
            >
              <Text style={[styles.logoutButtonText, { color: colors.text }]}>
                {t("Settings.logout")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.dangerBorder,
                },
              ]}
              activeOpacity={0.8}
              onPress={onDelete}
            >
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                {t("Settings.deleteAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ログインモーダル */}
        <LoginNeededModal
          visible={isLoginModalVisible}
          onClose={() => setIsLoginModalVisible(false)}
          message={t("Settings.loginRequired")}
        />

        {/* 🆕 Paywall Modal */}
        <Modal
          visible={showPaywall}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPaywall(false)}
        >
          <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} />
        </Modal>

        {/* 🆕 Customer Center Modal */}
        <Modal
          visible={showCustomerCenter}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCustomerCenter(false)}
        >
          <CustomCustomerCenterScreen
            onDismiss={() => setShowCustomerCenter(false)}
          />
        </Modal>

        {/* ローディングオーバーレイ */}
        {loading && <LoadingOverlay text={t("Settings.loggingOut")} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  infoItem: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  planItem: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planContent: {
    flex: 1,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  planValue: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  menuItem: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  menuItemArrow: {
    fontSize: 28,
    fontWeight: "300",
  },
  logoutButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
