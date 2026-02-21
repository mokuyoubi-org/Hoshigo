import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { StarBackground } from "@/src/components/StarBackGround";

export default function RegisterEmailSent() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const email = params.email as string;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="dark" />
             <StarBackground />   
      
      <View style={styles.content}>
        <View style={styles.successIconContainer}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("RegisterEmailSent.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {email}
          </Text>
          <Text style={[styles.description, { color: colors.subtext }]}>
            {t("RegisterEmailSent.description")}
          </Text>
        </View>

        {/* ボタン */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push("/Login")}
        >
          <Text style={[styles.buttonText, { color: colors.button }]}>
            {t("RegisterEmailSent.backToLogin")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#48bb78",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    color: "#ffffff",
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    width: 300,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  noteContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
