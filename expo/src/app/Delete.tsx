import { ConfirmModal } from "@/src/active/components/modals/ConfirmModal";
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "../active/contexts/ProfileContexts";

export default function Delete() {
  const t = useTranslation();
  const { profile } = useProfile();
  const { uid } = profile;
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    if (!uid) return;

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace("/Login");
  };

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── ヘッダー ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>
        </View>

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
      </ScrollView>

      <LoadingModal text={t("common.loading")} visible={loading} />

      <ConfirmModal
        visible={deleteModalVisible}
        title={t("DeleteModal.title")}
        message={t("DeleteModal.message")}
        confirmText={t("DeleteModal.confirm")}
        isDanger={true}
        onConfirm={onDelete}
        onCancel={() => setDeleteModalVisible(false)}
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
    paddingBottom: 48,
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

  // タイトル・説明
  textArea: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
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
    backgroundColor: COLORS.foreground,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
  cancelButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
});
