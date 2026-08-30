// src/components/IconSelectModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { ICONS } from "@/src/active/constants/icons";
import { useTranslation } from "@/src/active/language/i18n";

import { MaterialIcons } from "@expo/vector-icons";
import { ModalShell } from "modal-shell";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useProfile } from "../../contexts/ProfileContexts";
type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconIndex: number) => Promise<void> | void;
  currentIconIndex: number;
};

export default function IconSelectModal({
  visible,
  onClose,
  onSelectIcon,
  currentIconIndex,
}: Props) {
  const t = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const iconSize: number = 96;
  const imageSize: number = iconSize * (5 / 6);
  const { acquiredIcons } = useProfile();

  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleSelectIcon = async (index: number) => {
    try {
      setLoadingIndex(index);
      await onSelectIcon(index);
      onClose();
    } finally {
      setLoadingIndex(null);
    }
  };

  if (!visible) return null;

  return (
    <ModalShell onClose={loadingIndex !== null ? undefined : onClose} size="md">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-xl font-bold text-text">
          {t("IconSelectModal.title")}
        </Text>
      </View>

      {/* タイトルの下にScrollViewがあるので、flex-1ではなく明示的な高さを与える */}
      <ScrollView
        style={{ height: windowHeight * 0.32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-center gap-4">
          {acquiredIcons?.map((iconIndex) => {
            const icon = ICONS[iconIndex];
            const isSelected = currentIconIndex === iconIndex;
            const isLoadingThis = loadingIndex === iconIndex;

            return (
              <TouchableOpacity
                key={iconIndex}
                className={`bg-foreground rounded-3xl justify-center items-center relative border-2 ${
                  isSelected
                    ? "border-primary border-[3px]"
                    : "border-background"
                }`}
                style={{ width: iconSize, height: iconSize }}
                onPress={() => handleSelectIcon(iconIndex)}
                disabled={loadingIndex !== null}
                activeOpacity={0.7}
              >
                {isLoadingThis ? (
                  <ActivityIndicator size="large" color={COLORS.primary} />
                ) : (
                  <>
                    <Image
                      source={icon}
                      style={{ height: imageSize, width: imageSize }}
                      resizeMode="contain"
                    />
                    {isSelected && (
                      <View className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary justify-center items-center">
                        <MaterialIcons
                          name="check"
                          size={16}
                          color={COLORS.foreground}
                        />
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </ModalShell>
  );
}
