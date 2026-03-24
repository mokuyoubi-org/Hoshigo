// Delete.tsx
import { DeleteAccountModal } from "@/src/components/Modals/DeleteConfirmModal";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  DANGER,
  STRAWBERRY,
} from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { UidContext } from "@/src/contexts/UserContexts";
import { logoutRevenueCat } from "@/src/services/RevenueCat";
import { clearAllStorage } from "@/src/services/storage";
import { supabase } from "@/src/services/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import {
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Delete() {
  const { t } = useTranslation();
  const uid = useContext(UidContext);
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    if (!uid) return;

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      setLoading(false);
      console.log("error: ", error);
      return;
    }

    // ① グローバルスコープでサインアウト（サーバー側も無効化）
    await supabase.auth.signOut({ scope: "global" });

    // ② ローカルストレージを完全クリア
    await clearAllStorage();

    await logoutRevenueCat();
    setLoading(false);
    router.replace("/Goodbye");
  };
  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* 戻るボタン */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>

          {/* タイトル */}
          <View style={styles.textArea}>
            <Text style={styles.title}>{t("Delete.title")}</Text>
            <Text style={styles.subtitle}>{t("Delete.subtitle")}</Text>
          </View>

          <View style={styles.buttons}>
            {/* 削除ボタン */}
            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.8}
              onPress={() => setDeleteModalVisible(true)}
            >
              <Text style={styles.deleteButtonText}>
                {t("Delete.deleteButton")}
              </Text>
            </TouchableOpacity>
            {/* キャンセルボタン */}
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {<LoadingModal text={t("common.loading")} visible={loading} />}

      <DeleteAccountModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={onDelete}
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

  scrollView: {
    flexGrow: 1,
  },
  content: {
    justifyContent: "flex-start",
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

  subtitle: {
    fontSize: 14,
    color: CHOCOLATE_SUB,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.3,
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
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "rgba(224,92,92,0.5)",
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
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
});
