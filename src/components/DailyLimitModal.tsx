import CustomPaywallScreen from "@/app/(premium)/CustomPayWall";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface DailyLimitModalProps {
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
}

export const DailyLimitModal: React.FC<DailyLimitModalProps> = ({
  visible,
  onClose,
  colors,
  dailyLimit = 10,
  customMessage,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleGoToPaywall = () => {
    onClose();
    // router.push("/CustomPayWall");

    setShowPaywall(true); // ステートを更新して、Modalを表示させる
  };

  return (
    <>
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

            {/* 下部のテキストボタンは削除しました */}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🆕 Paywall Modal */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  limitModalContent: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    paddingTop: 32, // ×ボタンとかぶらないよう少し上を広めに
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 300,
    // position: "relative" は標準で有効ですが、絶対配置の親として機能します
  } as ViewStyle,

  // ─── 右上の×ボタンスタイル ───
  closeIconButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  } as ViewStyle,
  closeIconText: {
    fontSize: 22,
    fontWeight: "500",
    opacity: 0.6,
  } as TextStyle,

  limitModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  } as ViewStyle,
  limitModalIconText: {
    fontSize: 32,
  } as TextStyle,
  limitModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  } as TextStyle,
  limitModalMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24, // ボタンとの間隔調整
    lineHeight: 22,
  } as TextStyle,
  upgradeButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    paddingHorizontal: 10,
    // marginBottom は不要になったので削除（一番下のため）
  } as ViewStyle,
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  } as TextStyle,
});
