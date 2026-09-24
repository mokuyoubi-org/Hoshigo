// IconSelectModal.tsx

import { COLORS } from "@/src/active/constants/colors";
import { ICONS } from "@/src/active/constants/icons";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useTranslation } from "@/src/active/i18n";
import { winsToAcquiredIcons } from "@/src/stable/logics/winsToAcquiredIcons";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";

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
  const { wins9, wins13, wins19 } = useProfile();
  const acquiredIcons = winsToAcquiredIcons(
    wins9 ?? 0,
    wins13 ?? 0,
    wins19 ?? 0,
  );

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
          {Object.keys(ICONS)
            .map((key) => Number(key))
            .filter((iconIndex) => iconIndex < 100) // 100以上のボット用アイコンはお片付け（除外）する
            .map((iconIndex) => {
              const icon = ICONS[iconIndex];
              const isAcquired = acquiredIcons?.includes(iconIndex) ?? false;
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
                  style={{
                    width: iconSize,
                    height: iconSize,
                    opacity: isAcquired ? 1 : 0.3,
                  }}
                  onPress={() => handleSelectIcon(iconIndex)}
                  disabled={!isAcquired || loadingIndex !== null}
                  activeOpacity={0.7}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  ) : (
                    <>
                      <Image
                        source={icon}
                        style={{
                          height: imageSize,
                          width: imageSize,
                        }}
                        contentFit="contain"
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
