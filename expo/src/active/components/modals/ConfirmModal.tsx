import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
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
  title: string;
  message?: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isDanger?: boolean; // 削除など「危険な操作」のボタンを赤色っぽくしたい時用♪
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDanger = false,
}: Props) => {
  const t = useTranslation();

  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
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
          style={[styles.container, { backgroundColor: COLORS.foreground }]}
          onStartShouldSetResponder={() => true}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeButtonText, { color: COLORS.textSub }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* メッセージ（ある時だけ表示） */}
          {message && (
            <Text style={[styles.message, { color: COLORS.textSub }]}>
              {message}
            </Text>
          )}

          {/* ボタン群（縦並び） */}
          <View style={styles.buttonContainer}>
            {/* メインボタン */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: isDanger
                    ? COLORS.danger
                    : COLORS.primaryDark,
                },
              ]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.foreground} />
              ) : (
                <Text style={styles.primaryText}>{confirmText}</Text>
              )}
            </TouchableOpacity>

            {/* キャンセルボタン */}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: COLORS.background,
                  borderColor: COLORS.backgroundDark,
                },
              ]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryText, { color: COLORS.text }]}>
                {cancelText ?? t("common.cancel")}
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
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "bold",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
