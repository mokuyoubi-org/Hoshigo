// app/components/LoadingOverlay.tsx
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Animated, StyleSheet, Text } from "react-native";
import { useTheme } from "../hooks/useTheme";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

type LoadingOverlayProps = {
  text?: string; // 表示するテキストだけ props に
};

export default function LoadingOverlay({ text }: LoadingOverlayProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.loadingOverlay,
        {
          backgroundColor: `${BACKGROUND}E6`, // 90%の不透明度
          opacity: fadeIn,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.loadingBox,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ActivityIndicator size="large" color={STRAWBERRY} />
        <Text style={styles.loadingText}>
          {text || t("LoadingOverlay.loading")}
        </Text>
      </Animated.View>
    </Animated.View>
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
    width: 200,
    height: 140,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
});
