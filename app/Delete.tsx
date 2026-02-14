import LoadingOverlay from "@/src/components/LoadingOverlay";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { UidContext } from "../src/components/UserContexts";
import { supabase } from "../src/lib/supabase";
import { useTheme } from "../src/lib/useTheme";

export default function Delete() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const uid = useContext(UidContext);
  const [loading, setLoading] = useState(false);

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
      setLoading(false);

      router.replace("/Login");
    }
    if (error) {
      setLoading(false);

      console.log("error: ", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={[styles.backButtonText, { color: colors.button }]}>
                ‹ {t("Delete.back")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("Delete.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t("Delete.subtitle")}
            </Text>
          </View>

          {/* ボタン */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: colors.card, borderColor: "#e53e3e" },
              ]}
              activeOpacity={0.8}
              onPress={onDelete}
            >
              <Text style={styles.deleteButtonText}>
                {t("Delete.deleteButton")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Text style={[styles.cancelButtonText, { color: colors.button }]}>
                {t("Delete.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ← ここがLoadingオーバーレイ */}
      {loading && <LoadingOverlay text={t("Delete.loading")} />}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    marginBottom: 48,
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
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
    textAlign: "center",
    lineHeight: 22,
  },
  buttons: {
    width: "100%",
  },
  deleteButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e53e3e",
    letterSpacing: 0.3,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
