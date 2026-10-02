// DoubleTapModal.tsx

import { useTranslation } from "@/src/active/i18n/LangProvider";
import React from "react";
import { View } from "react-native";
import { useKVStorage } from "storage-kit";
import { ModalShell, ToggleSwitch } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { Divider } from "../common/Divider";

type Props = {
  isMatching?: boolean;
  onClose: () => void;
};

export function DoubleTapModal({ isMatching, onClose }: Props) {
  const colors = useColors();
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
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      contentPadding={16}
    >
      <AppText className="text-xl text-text text-center pb-4">
        {t("Settings.doubleTap")}
      </AppText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {/* 9路 */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("common.nineBoard")}
          </AppText>
          {isDoubleTap9Loaded && (
            <ToggleSwitch
              value={doubleTap9}
              onToggle={setDoubleTap9}
              disabled={isMatching}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          )}
        </View>

        <Divider />

        {/* 13路 */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("common.thirteenBoard")}
          </AppText>
          {isDoubleTap13Loaded && (
            <ToggleSwitch
              value={doubleTap13}
              onToggle={setDoubleTap13}
              disabled={isMatching}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          )}
        </View>

        <Divider />

        {/* 19路 */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("common.nineteenBoard")}
          </AppText>
          {isDoubleTap19Loaded && (
            <ToggleSwitch
              value={doubleTap19}
              onToggle={setDoubleTap19}
              disabled={isMatching}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          )}
        </View>
      </View>
    </ModalShell>
  );
}
