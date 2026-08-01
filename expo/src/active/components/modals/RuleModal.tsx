import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  colors: typeof COLORS;
};

export function RuleModal({ visible, onClose }: Props) {
  const t = useTranslation();
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
            // style={styles.modalScroll}
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
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.overlay,
  },

  modalContent: {
    borderRadius: 24,
    backgroundColor: COLORS.foreground,
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
    color: COLORS.text,
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
    color: COLORS.text,
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
    backgroundColor: COLORS.text,
  },

  ruleContent: {
    flex: 1,
  },

  ruleTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: COLORS.text,
  },

  ruleDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
});
