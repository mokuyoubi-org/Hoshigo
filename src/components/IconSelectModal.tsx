// src/components/IconSelectorModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AcquiredIconIndicesContext,
  GumiIndexContext,
} from "../../src/components/UserContexts";
import { ICONS } from "../lib/icons";
import { useTheme } from "../lib/useTheme";

interface IconSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconIndex: number) => void;
  currentIconIndex: number;
}

// ももぐみ　デフォルト アイコン 0 // いるか
//

export default function IconSelectorModal({
  visible,
  onClose,
  onSelectIcon,
  currentIconIndex,
}: IconSelectorModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const acquiredIconIndices = useContext<number[] | null>(
    AcquiredIconIndicesContext,
  );
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
            { backgroundColor: colors.background },
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
              {/* {ICONS.map((icon, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.iconItem,
                    { backgroundColor: colors.card },
                    currentIconIndex === index && styles.selectedIconItem,
                    currentIconIndex === index && {
                      borderColor: colors.background,
                    },
                  ]}
                  onPress={() => handleSelectIcon(index)}
                  activeOpacity={0.7}
                >
                  <Image source={icon} style={styles.iconImage} />
                  {currentIconIndex === index && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <MaterialIcons name="check" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))} */}

              {[
                ...(acquiredIconIndices ?? []),
                ...Array.from({ length: (gumiIndex ?? 0) + 1 }, (_, i) => i),
              ]?.map((iconIndex) => {
                const icon = ICONS[iconIndex];

                return (
                  <TouchableOpacity
                    key={iconIndex}
                    style={[
                      styles.iconItem,
                      { backgroundColor: colors.card },
                      currentIconIndex === iconIndex && styles.selectedIconItem,
                      currentIconIndex === iconIndex && {
                        borderColor: colors.background,
                      },
                    ]}
                    onPress={() => handleSelectIcon(iconIndex)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={icon}
                      style={styles.iconImage}
                      resizeMode="contain"
                    />
                    {currentIconIndex === iconIndex && (
                      <View
                        style={[
                          styles.checkmark,
                          { backgroundColor: colors.background },
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
    width: Dimensions.get("window").width * 0.9,
    maxWidth: 400,
    maxHeight: Dimensions.get("window").height * 0.7,
    height: 360,
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
    justifyContent: "flex-start",
    gap: 16,
  },
  iconItem: {
    width: 96,
    height: 96,
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
  iconImage: {
    width: 80,
    height: 80,
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
