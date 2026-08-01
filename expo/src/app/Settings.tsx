import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotOnOffButton } from "@/src/active/components/buttons/BotOnOffButton";
import { ConfirmModal } from "@/src/active/components/modals/ConfirmModal";
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { useProfile } from "../active/contexts/ProfileContexts";

export default function Settings() {
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const { isMatching } = useMatching();
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const { profile, updateProfile } = useProfile();
  const { uid, email, allowBotMatch } = profile;

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

  // ⬜️ ボット対局のオン/オフを切り替えた時の処理 ⬜️
  const handleToggleBotMatch = (newValue: boolean) => {
    if (!uid) {
      setIsLoginModalVisible(true);
      return;
    }
    const updateAllowBotMatch = async () => {
      setLoading(true);
      const { error } = await supabase.rpc("update_allow_bot_match", {
        new_allow_bot_match: newValue,
      });
      if (error) {
        console.error(error);
      } else {
        updateProfile({ allowBotMatch: newValue });
      }
      setLoading(false);
    };
    updateAllowBotMatch();
  };

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── ヘッダー ─── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/Profile")}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>{t("common.settings")}</Text>

        {/* ─── アカウント情報 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Settings.accountInfo")}</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t("common.email")}</Text>
            <Text style={styles.cardValue}>
              {email || t("Settings.notSet")}
            </Text>
          </View>
        </View>

        {/* ─── 対局設定 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Settings.matchSettings")}</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t("Settings.allowBotMatch")}</Text>
            <BotOnOffButton
              value={allowBotMatch ?? true}
              onToggle={handleToggleBotMatch}
              disabled={!uid || isMatching}
            />
          </View>
        </View>

        {/* ─── 情報 ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Settings.information")}</Text>
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => openURL("https://mokuyoubi.org/privacy")}
            >
              <Text style={styles.cardLabel}>
                {t("Settings.privacyPolicy")}
              </Text>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => openURL("https://mokuyoubi.org/terms")}
            >
              <Text style={styles.cardLabel}>
                {t("Settings.termsOfService")}
              </Text>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── アカウント操作 ─── */}
        <View style={styles.actionSection}>
          {/* ログアウトボタン */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              (loading || isMatching) && styles.buttonDisabled,
            ]}
            disabled={loading}
            activeOpacity={0.8}
            onPress={() => setLogoutModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>{t("common.logout")}</Text>
          </TouchableOpacity>

          {/* アカウント削除ボタン */}
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (loading || isMatching) && styles.buttonDisabled,
            ]}
            disabled={loading}
            activeOpacity={0.8}
            onPress={onDelete}
          >
            <Text style={styles.deleteButtonText}>
              {t("Settings.deleteAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── モーダル類 ─── */}
      <ConfirmModal
        visible={isLoginModalVisible}
        title={t("Home.loginRequired")}
        confirmText={t("common.login")}
        onConfirm={() => {
          setIsLoginModalVisible(false);
          router.push("/Login");
        }}
        onCancel={() => setIsLoginModalVisible(false)}
      />

      <LoadingModal text={t("common.loading")} visible={loading} />

      <ConfirmModal
        visible={logoutModalVisible}
        title={t("LogoutModal.title")}
        confirmText={t("common.logout")}
        onConfirm={onLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 8,
    height: 44,
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 20,
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
    color: COLORS.text,
    marginBottom: 10,
    marginLeft: 4,
  },

  // ─── 共通カード ───
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 56,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSub,
    letterSpacing: 0.2,
  },
  cardArrow: {
    fontSize: 24,
    fontWeight: "300",
    color: COLORS.text,
    opacity: 0.5,
  },

  // ─── アクションボタン ───
  actionSection: {
    gap: 12,
  },
  actionButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  deleteButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderWidth: 2,
    borderColor: COLORS.dangerLight,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
});
