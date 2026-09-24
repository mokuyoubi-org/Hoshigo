// DoubleTapModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/i18n";
import React from "react";
import { Text, View } from "react-native";
import { useKVStorage } from "storage-kit";
import { ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  isMatching?: boolean;
  onClose: () => void;
};

export function DoubleTapModal({ isMatching, onClose }: Props) {
  const t = useTranslation();

  const {
    value: doubleTap9,
    setValue: setDoubleTap9,
    isLoaded: isDoubleTap9Loaded,
  } = useKVStorage<boolean>("global.doubleTap9", false);
  const {
    value: doubleTap13,
    setValue: setDoubleTap13,
    isLoaded: isDoubleTap13Loaded,
  } = useKVStorage<boolean>("global.doubleTap13", true);
  const {
    value: doubleTap19,
    setValue: setDoubleTap19,
    isLoaded: isDoubleTap19Loaded,
  } = useKVStorage<boolean>("global.doubleTap19", true);

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      style={{ alignItems: "center", gap: 16 }}
    >
      <Text className="text-xl font-bold color-text text-center pb-4">
        {t("Settings.doubleTap")}
      </Text>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {/* 9路 */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("common.nineBoard")}
          </Text>
          {isDoubleTap9Loaded && (
            <ToggleSwitch
              value={doubleTap9}
              onToggle={setDoubleTap9}
              disabled={isMatching}
              backgroundColor={COLORS.primary}
              toggleColor={COLORS.foreground}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* 13路 */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("common.thirteenBoard")}
          </Text>
          {isDoubleTap13Loaded && (
            <ToggleSwitch
              value={doubleTap13}
              onToggle={setDoubleTap13}
              disabled={isMatching}
              backgroundColor={COLORS.primary}
              toggleColor={COLORS.foreground}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* 19路 */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("common.nineteenBoard")}
          </Text>
          {isDoubleTap19Loaded && (
            <ToggleSwitch
              value={doubleTap19}
              onToggle={setDoubleTap19}
              disabled={isMatching}
              backgroundColor={COLORS.primary}
              toggleColor={COLORS.foreground}
            />
          )}
        </View>
      </View>
    </ModalShell>
  );
}
