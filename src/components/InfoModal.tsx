import React from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ─── LoadingOverlayと同じカラー ─────────────────────── */
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

type InfoModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: {
    card: string;
    text: string;
    subtext: string;
    background: string;
  };
};

export const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  const RuleItem = ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <View style={styles.ruleItem}>
      <View style={styles.ruleBullet} />
      <View style={styles.ruleContent}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("InfoModal.title")}</Text>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Scroll Area */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: `${BACKGROUND}E6`, // 90%透明
  },

  modalContent: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: "hidden",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },

  closeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: 26,
    fontWeight: "300",
    color: CHOCOLATE_SUB,
  },

  modalScroll: {
    maxHeight: 500,
  },

  modalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },

  ruleItem: {
    flexDirection: "row",
    marginBottom: 22,
    alignItems: "flex-start",
  },

  ruleBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 14,
    backgroundColor: STRAWBERRY,
  },

  ruleContent: {
    flex: 1,
  },

  ruleTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: CHOCOLATE,
  },

  ruleDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: CHOCOLATE_SUB,
  },
});
