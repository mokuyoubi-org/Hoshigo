import LoginNeededModal from "@/src/components/Modals/LoginNeededModal";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LoadingModal from "@/src/components/Modals/LoadingModal";
import { LogoutConfirmModal } from "@/src/components/Modals/LogoutConfirmModal";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  DANGER,
  GOLD,
  STRAWBERRY,
} from "@/src/constants/colors";
import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";
import {
  EmailContext,
  PlanIdContext,
  UidContext,
} from "@/src/contexts/UserContexts";
import { supabase } from "@/src/services/supabase";

export default function Settings() {
  const { planId, setPlanId } = useContext(PlanIdContext)!;
  const { lang, setLang } = useContext(LangContext)!;
  const { t } = useTranslation();
  // ── ロジック（変更なし） ──
  const [loading, setLoading] = useState(false);
  const email = useContext<string | null>(EmailContext);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const uid = useContext(UidContext);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const onDelete = async () => {
    if (!uid) {
      setIsLoginModalVisible(true);
    } else {
      router.push("/Delete");
    }
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("URLを開けませんでした:", err),
    );
  };

  const currentLanguageLabel =
    (
      { zh: "中文", ko: "한국어", ja: "日本語", en: "English" } as Record<
        string,
        string
      >
    )[lang.split("-")[0]] ?? lang;

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* ─── ヘッダー ─── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/PlayerPage")}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
            </TouchableOpacity>
            <View style={styles.pageTitleRow}>
              <Text style={styles.pageTitle}>{t("common.settings")}</Text>
            </View>
          </View>

          {/* ─── アカウント情報 ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Settings.accountInfo")}</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("common.email")}</Text>
              <Text style={styles.infoValue}>
                {email || t("Settings.notSet")}
              </Text>
            </View>
          </View>

          {/* ─── プラン ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("common.plan")}</Text>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                router.push("/(subscription)/Subscription");
              }}
            >
              <View style={styles.menuItemInner}>
                <View style={styles.menuItemLeft}>
                  <View>
                    <Text style={styles.planValue}>
                      {planId === null || planId <= 0
                        ? t("Settings.startPlan")
                        : planId <= 1
                          ? t("Settings.plusPlan")
                          : t("Settings.ultraPlan")}
                    </Text>
                  </View>
                </View>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ─── カスタマイズ ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("common.language")}</Text>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => router.push("/(settings)/Language")}
            >
              <View style={styles.menuItemInner}>
                <View>
                  <Text style={styles.infoValue}>{currentLanguageLabel}</Text>
                </View>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ─── 情報 ─── */}
          <Text style={styles.sectionTitle}>{t("Settings.information")}</Text>
          {[
            {
              label: t("Settings.privacyPolicy"),
              url: "https://mokuyoubi.org/privacy",
            },
            {
              label: t("Settings.termsOfService"),
              url: "https://mokuyoubi.org/terms",
            },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.url}
              style={[
                styles.menuItem,
                i < arr.length - 1 && styles.menuItemBorderBottom,
                {
                  borderRadius: i === 0 ? 14 : i === arr.length - 1 ? 14 : 0,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => openURL(item.url)}
            >
              <View style={styles.menuItemInner}>
                <Text style={styles.menuItemText}>{item.label}</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* ─── アカウント操作 ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("Settings.accountActions")}
            </Text>
            {/* ログアウトボタン */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                loading && styles.actionButtonDisabled,
              ]}
              disabled={loading}
              activeOpacity={0.8}
              onPress={() => setLogoutModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>{t("common.logout")}</Text>
            </TouchableOpacity>
            {/* アカウント削除ボタン */}
            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.8}
              onPress={onDelete}
            >
              <Text style={styles.dangerButtonText}>
                {t("Settings.deleteAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── モーダル類 ─── */}
        <LoginNeededModal
          visible={isLoginModalVisible}
          onClose={() => setIsLoginModalVisible(false)}
          message={t("Settings.loginRequired")}
        />

        <LoadingModal text={t("common.loading")} visible={loading} />

        <LogoutConfirmModal
          visible={logoutModalVisible}
          onCancel={() => setLogoutModalVisible(false)}
          onConfirm={onLogout}
        />
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 8,
  },

  // ─── ヘッダー ───
  header: {
    marginBottom: 24,
  },

  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1,
  },

  // ─── セクション ───
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CHOCOLATE_SUB,
    marginBottom: 10,
    marginLeft: 4,
  },

  // ─── インフォカード ───
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: CHOCOLATE_SUB,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: CHOCOLATE,
    letterSpacing: 0.2,
  },

  // ─── メニューアイテム共通 ───
  menuItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
    marginBottom: 8,
  },
  menuItemPro: {
    borderColor: `${GOLD}50`,
  },
  menuItemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
    borderRadius: 0,
    marginBottom: 0,
  },
  menuItemInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  menuItemArrow: {
    fontSize: 24,
    fontWeight: "300",
    color: CHOCOLATE_SUB,
    opacity: 0.5,
  },
  planValue: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },

  // ─── メニューグループ（情報セクション） ───
  menuGroup: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
  },

  // ─── アクションボタン ───
  actionButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    marginBottom: 10,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  dangerButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(224,92,92,0.3)",
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: DANGER,
    letterSpacing: 0.5,
  },
});
