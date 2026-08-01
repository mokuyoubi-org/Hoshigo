// src/components/IconSelectorModal.tsx
import { ICONS } from "@/src/active/constants/icons";
import { useTranslation } from "@/src/active/hooks/useTranslation";

import { COLORS } from "@/src/active/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
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
import { useProfile } from "../../contexts/ProfileContexts";
type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconIndex: number) => void;
  currentIconIndex: number;
};

export default function IconSelectorModal({
  visible,
  onClose,
  onSelectIcon,
  currentIconIndex,
}: Props) {
  const t = useTranslation();
  const { height, width } = useWindowDimensions();
  const iconSize: number = 96;
  const imageSize: number = iconSize * (5 / 6);

  const { profile } = useProfile();
  const { acquiredIcons } = profile;
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
              backgroundColor: COLORS.background,
              height: height * (48 / 100),
              width: width * (84 / 100),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {t("IconSelectorModal.title")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* アイコングリッド */}
          <ScrollView style={styles.scrollView}>
            <View style={styles.iconGrid}>
              {acquiredIcons?.map((iconIndex) => {
                const icon = ICONS[iconIndex];

                return (
                  <TouchableOpacity
                    key={iconIndex}
                    style={[
                      styles.iconItem,
                      {
                        backgroundColor: COLORS.foreground,
                        width: iconSize,
                        height: iconSize,
                      },
                      currentIconIndex === iconIndex && styles.selectedIconItem,
                      currentIconIndex !== iconIndex && {
                        borderColor: COLORS.background,
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
                          { backgroundColor: COLORS.primary },
                        ]}
                      >
                        <MaterialIcons
                          name="check"
                          size={16}
                          color={COLORS.foreground}
                        />
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
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    margin: 24,
    borderRadius: 20,
    padding: 24,
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
    // flex: 1,
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
    borderColor: COLORS.primaryLight,
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
