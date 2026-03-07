// src/components/IconSelectorModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GumiIndexContext } from "../../src/components/UserContexts";
import { ICONS } from "../constants/icons";
import { useTheme } from "../hooks/useTheme";

interface IconSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconIndex: number) => void;
  currentIconIndex: number;
}

export default function IconSelectorModal({
  visible,
  onClose,
  onSelectIcon,
  currentIconIndex,
}: IconSelectorModalProps) {
  const { height } = useWindowDimensions();
  const iconSize: number = 96;
  const imageSize: number = iconSize * (5 / 6);
  // カラム数

  const { colors } = useTheme();
  const { t } = useTranslation();

  const gumiIndex = useContext<number | null>(GumiIndexContext);

  const handleSelectIcon = (index: number) => {
    onSelectIcon(index);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              maxHeight: height * (72 / 100),
              maxWidth: height * (72 / 100),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("IconSelectorModal.title")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* アイコングリッド */}
          <ScrollView style={styles.scrollView}>
            <View style={styles.iconGrid}>
              {[
                ...Array.from({ length: (gumiIndex ?? 0) + 1 }, (_, i) => i),
              ]?.map((iconIndex) => {
                const icon = ICONS[iconIndex];

                return (
                  <TouchableOpacity
                    key={iconIndex}
                    style={[
                      styles.iconItem,
                      {
                        backgroundColor: colors.card,
                        width: iconSize,
                        height: iconSize,
                      },
                      currentIconIndex === iconIndex && styles.selectedIconItem,
                      currentIconIndex !== iconIndex && {
                        borderColor: colors.background,
                      },
                    ]}
                    onPress={() => handleSelectIcon(iconIndex)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={icon}
                      style={{ height: imageSize, width: imageSize }}
                      resizeMode="contain"
                    />
                    {currentIconIndex === iconIndex && (
                      <View
                        style={[
                          styles.checkmark,
                          { backgroundColor: colors.active },
                        ]}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    margin: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  iconItem: {
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  selectedIconItem: {
    borderWidth: 3,
  },

  checkmark: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
