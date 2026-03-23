import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";
import { Lang } from "@/src/services/translations";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { langStore } from "@/src/services/storage";

type LangOption = { code: Lang; nativeName: string };

const LANG_OPTIONS: LangOption[] = [
  { code: "zh", nativeName: "中文" },
  { code: "ko", nativeName: "한국어" },
  { code: "ja", nativeName: "日本語" },
  { code: "en", nativeName: "English" },
];

export default function LanguagePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { lang, setLang } = useContext(LangContext)!;

const handleSelect = async (code: Lang) => {
  if (!setLang) return;
  setLang(code);
  await langStore.set(code);
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {/* <StarBackground /> */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* ─── ヘッダー ─── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
            </TouchableOpacity>
            <View style={styles.pageTitleRow}>
              <Text style={styles.pageTitle}>{t("common.language")}</Text>
            </View>
          </View>

          {/* ─── 言語リスト ─── */}
          <View style={styles.section}>
            {LANG_OPTIONS.map((option) => {
              const isSelected = lang === option.code;
              return (
                <TouchableOpacity
                  key={option.code}
                  style={[
                    styles.menuItem,
                    isSelected && styles.menuItemSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(option.code)}
                >
                  <View style={styles.menuItemInner}>
                    <Text style={styles.menuItemText}>{option.nativeName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 8,
  },

  // ─── ヘッダー ───
  header: { height: 84 },
  backButton: { height: 36, alignSelf: "flex-start" },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },
  pageTitleRow: { flexDirection: "row", alignItems: "center", height: 36 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1,
  },

  // ─── セクション ───
  section: { gap: 8 },

  // ─── メニューアイテム ───
  menuItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
  },
  menuItemSelected: {
    backgroundColor: "#f0f0f0",
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
    paddingHorizontal: 24,
    paddingVertical: 24,
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
  menuItemTextSelected: {
    color: STRAWBERRY,
    fontWeight: "700",
  },
  menuItemArrow: {
    fontSize: 24,
    fontWeight: "300",
    color: CHOCOLATE_SUB,
    opacity: 0.5,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
  },
});
