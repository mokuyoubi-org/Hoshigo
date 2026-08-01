import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterEmailSent() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const t = useTranslation();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.successIconContainer}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: COLORS.text }]}>
            {t("RegisterEmailSent.title")}
          </Text>
          <Text style={[styles.subtitle, { color: COLORS.textSub }]}>
            {email}
          </Text>
          <Text style={[styles.description, { color: COLORS.textSub }]}>
            {t("RegisterEmailSent.description")}
          </Text>
        </View>

        {/* ボタン */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: COLORS.background,
              borderColor: COLORS.primary,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push("/Login")}
        >
          <Text style={[styles.buttonText, { color: COLORS.text }]}>
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
    backgroundColor: COLORS.safe,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    color: COLORS.foreground,
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
