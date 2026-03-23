// src/components/Modals/ConfirmUsernameModal.tsx
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { useTheme } from "@/src/hooks/useTheme";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  displayname: string;
  username: string;
  resolvedUsername: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmUsernameModal({
  visible,
  displayname,
  username,
  resolvedUsername,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container,{backgroundColor: colors.background}]}>
          {/* タイトル */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t("ConfirmUsernameModal.title")}
          </Text>

          {/* 表示名 */}
          <View
            style={[
              styles.infoBlock,
              {borderColor: colors.borderColor },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.button }]}>
              {t("common.displayname")}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {displayname}
            </Text>
          </View>

          {/* ユーザー名 */}
          <View
            style={[
              styles.infoBlock,
              { borderColor: colors.borderColor },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.button }]}>
              {t("common.username")}
            </Text>
            <View style={styles.usernameRow}>
              <Text style={[styles.prefix, { color: colors.subtext }]}>@</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {resolvedUsername}
              </Text>
            </View>
          </View>

          {/* 説明文 */}
          <Text style={[styles.message, { color: colors.subtext }]}>
            {resolvedUsername === username
              ? t("ConfirmUsernameModal.messageClean")
              : t("ConfirmUsernameModal.messageTaken", { username })}
          </Text>

          {/* ボタン */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.button }]}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={[styles.confirmText, { color: colors.card }]}>
              {t("common.yes")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: colors.card, borderColor: colors.borderColor },
            ]}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: colors.button }]}>
              {t("common.no")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  container: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  infoBlock: {
            backgroundColor:"#ffffff",

    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  prefix: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 2,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    marginTop: 4,
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});