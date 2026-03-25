import { DANGER } from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { useTheme } from "@/src/hooks/useTheme";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export const DeleteAccountModal = ({ visible, onCancel, onConfirm }: Props) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          style={[styles.container, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title]}>{t("DeleteModal.title")}</Text>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              disabled={loading}
            >
              <Text style={[styles.closeButtonText, { color: colors.subtext }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* メッセージ */}
          <Text style={[styles.message, { color: colors.subtext }]}>
            {t("DeleteModal.message")}
          </Text>

          {/* ボタン（縦並び） */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {t("DeleteModal.confirm")}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderColor,
                },
              ]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    borderRadius: 16,
    width: "100%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    color: "#604848",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 32,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "rgba(224,92,92,0.5)",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: DANGER,
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
