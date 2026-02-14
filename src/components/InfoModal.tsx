// InfoModal.tsx
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

/**
 * 情報モーダルのProps定義
 */
type InfoModalProps = {
  /** モーダルの表示・非表示 */
  visible: boolean;
  /** モーダルを閉じる処理 */
  onClose: () => void;
  /** テーマカラー(useTheme などから渡す想定) */
  colors: {
    card: string;
    text: string;
    subtext: string;
    background: string;
  };
};

/**
 * ルール説明用の情報モーダル
 */
export const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  onClose,
  colors,
}) => {
  const { t } = useTranslation();

  const RuleItem = ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <View style={styles.ruleItem}>
      <View
        style={[styles.ruleBullet, { backgroundColor: colors.background }]}
      />
      <View style={styles.ruleContent}>
        <Text style={[styles.ruleTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.ruleDescription, { color: colors.subtext }]}>
          {description}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      {/* 背景オーバーレイ(タップで閉じる) */}
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* モーダル本体 */}
        <View
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          {/* ヘッダー */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("InfoModal.title")}
            </Text>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.subtext }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* 本文スクロール */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <RuleItem
              title={t("InfoModal.ruleTitle")}
              description={t("InfoModal.ruleDescription")}
            />
            <RuleItem
              title={t("InfoModal.boardTitle")}
              description={t("InfoModal.boardDescription")}
            />
            <RuleItem
              title={t("InfoModal.komiTitle")}
              description={t("InfoModal.komiDescription")}
            />
            <RuleItem
              title={t("InfoModal.timeLimitTitle")}
              description={t("InfoModal.timeLimitDescription")}
            />
            <RuleItem
              title={t("InfoModal.objectiveTitle")}
              description={t("InfoModal.objectiveDescription")}
            />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 28,
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  ruleItem: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  ruleBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
});