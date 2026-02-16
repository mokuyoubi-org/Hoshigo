// app/components/LoadingOverlay.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type LoadingOverlayProps = {
  text?: string; // 表示するテキストだけ props に
};

export default function LoadingOverlay({ text }: LoadingOverlayProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.loadingOverlay,
        { backgroundColor: `${colors.background}B3` },
      ]}
    >
      <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.button} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {text || t("LoadingOverlay.loading")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    width: 180,
    height: 120,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
