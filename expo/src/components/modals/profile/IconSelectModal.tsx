// IconSelectModal.tsx

import { MyImage } from "@/src/components/common/MyImage";
import { MyText } from "@/src/components/common/MyText";
import { ICONS } from "@/src/constants/icons";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { winsToAcquiredIcons } from "@/src/logics/rank/winsToAcquiredIcons";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
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
  const colors = useColors();
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
    <ModalShell
      onClose={loadingIndex !== null ? undefined : onClose}
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View className="flex-row justify-between items-center mb-6">
        <MyText className="text-xl text-text">
          {t("IconSelectModal.title")}
        </MyText>
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
                      ? "border-primary border-4"
                      : "border-backgroundStrong border-2"
                  }`}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    opacity: isAcquired ? 1 : 0.3, // このopacityは許可
                  }}
                  onPress={() => {
                    if (!isSelected && isAcquired && loadingIndex === null) {
                      handleSelectIcon(iconIndex);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <View>
                      <MyImage
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
                            color={colors.foreground}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </ModalShell>
  );
}
