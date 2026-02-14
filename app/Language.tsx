import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/lib/useTheme";

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};

const LANGUAGES: LanguageOption[] = [
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "en", name: "English", nativeName: "English" },
];

export default function Language() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const changeLanguage = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem("userLanguage", languageCode);
      setSelectedLanguage(languageCode);
    } catch (error) {
      console.error("言語の変更に失敗しました:", error);
    }
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
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonText, { color: colors.active }]}>
                ‹ {t("Language.back")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("Language.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t("Language.subtitle")}
            </Text>
          </View>

          {/* 言語選択セクション */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("Language.availableLanguages")}
            </Text>

            {LANGUAGES.map((language, index) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageItem,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      selectedLanguage === language.code
                        ? colors.active
                        : colors.borderColor,
                    borderWidth: selectedLanguage === language.code ? 2 : 1,
                  },
                  index < LANGUAGES.length - 1 && styles.languageItemMargin,
                ]}
                activeOpacity={0.7}
                onPress={() => changeLanguage(language.code)}
              >
                <View style={styles.languageContent}>
                  <Text
                    style={[styles.languageNativeName, { color: colors.text }]}
                  >
                    {language.nativeName}
                  </Text>
                  <Text
                    style={[styles.languageName, { color: colors.subtext }]}
                  >
                    {language.name}
                  </Text>
                </View>
                {selectedLanguage === language.code && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: colors.active },
                    ]}
                  >
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 注意書き */}
          <View style={styles.noteContainer}>
            <Text style={[styles.noteText, { color: colors.subtext }]}>
              {t("Language.note")}
            </Text>
          </View>
        </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  languageItem: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languageItemMargin: {
    marginBottom: 12,
  },
  languageContent: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  languageName: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  noteContainer: {
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});
