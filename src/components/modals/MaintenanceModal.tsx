// @/src/components/modals/MaintenanceModal.tsx
import { t } from "@/src/services/translations";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function MaintenanceModal({ message }: { message: string | null }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("MaintenanceModal.title")}</Text>
        <Text style={styles.message}>
          {message ?? t("MaintenanceModal.message")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
});
