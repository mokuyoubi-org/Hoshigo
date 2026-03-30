// import CustomPaywallScreen from "@/src/components/Sheets/CustomPayWallSheet";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { router } from "expo-router";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  colors: {
    card: string;
    background: string;
    text: string;
    subtext: string;
    active: string;
    inactive?: string;
  };
  dailyLimit?: number;
  customMessage?: string;
};

export function DailyLimitModal({
  visible,
  onClose,
  colors,
  dailyLimit = 10,
  customMessage,
}: Props) {
  const { t } = useTranslation();

  const handleGoToPaywall = () => {
    onClose();
    router.push("/Subscription");
  };

  return (
    <View>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={[styles.limitModalContent, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            {/* ─── 右上の × ボタン ─── */}
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <Text style={[styles.closeIconText, { color: colors.subtext }]}>
                ✕
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.limitModalIcon,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={styles.limitModalIconText}>⏰</Text>
            </View>

            <Text style={[styles.limitModalTitle, { color: colors.text }]}>
              {t("DailyLimitModal.title")}
            </Text>

            <Text style={[styles.limitModalMessage, { color: colors.subtext }]}>
              {customMessage || t("DailyLimitModal.message", { dailyLimit })}
            </Text>

            {/* 🚀 アップグレードボタン */}
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: colors.active }]}
              onPress={handleGoToPaywall}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>
                {t("DailyLimitModal.upgrade")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  limitModalContent: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    paddingTop: 32, // ×ボタンとかぶらないよう少し上を広めに
    alignItems: "center",
  },

  // ─── 右上の×ボタンスタイル ───
  closeIconButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  closeIconText: {
    fontSize: 22,
    fontWeight: "500",
    opacity: 0.6,
  },

  limitModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  limitModalIconText: {
    fontSize: 32,
  },
  limitModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  limitModalMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24, // ボタンとの間隔調整
    lineHeight: 22,
  },
  upgradeButton: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
