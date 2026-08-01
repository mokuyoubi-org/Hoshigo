// app/components/LoadingOverlay.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
} from "react-native";

type Props = {
  visible: boolean;
  text?: string;
};

export default function LoadingModal({ visible, text }: Props) {
  const t = useTranslation();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!visible) return;

    fadeIn.setValue(0);
    scaleAnim.setValue(0.9);

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
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[
          styles.loadingOverlay,
          {
            backgroundColor: COLORS.overlay,
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
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{text || t("common.loading")}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    width: 200,
    height: 140,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
});
