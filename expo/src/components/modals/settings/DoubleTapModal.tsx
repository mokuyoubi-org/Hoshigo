// DoubleTapModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { useKVStorage } from "kv-store";
import React from "react";
import { View } from "react-native";
import { Divider, ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  onClose: () => void;
};

export const DoubleTapModal = ({ onClose }: Props) => {
  const colors = useColors();
  const t = useTranslation();

  const { value: doubleTap9, setValue: setDoubleTap9 } = useKVStorage<boolean>(
    "global.doubleTap9",
    false,
  );
  const { value: doubleTap13, setValue: setDoubleTap13 } =
    useKVStorage<boolean>("global.doubleTap13", true);
  const { value: doubleTap19, setValue: setDoubleTap19 } =
    useKVStorage<boolean>("global.doubleTap19", true);

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      contentPadding={16}
    >
      <MyText className="text-xl text-text text-center pb-4">
        {t("Settings.doubleTap")}
      </MyText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {/* 9路 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">{t("common.nineBoard")}</MyText>
          <ToggleSwitch
            value={doubleTap9}
            onToggle={setDoubleTap9}
            backgroundOnColor={colors.primary}
            backgroundOffColor={colors.backgroundStrong}
            toggleColor={colors.foreground}
          />
        </View>

        <Divider backgroundColor={colors.backgroundStrong} />

        {/* 13路 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">
            {t("common.thirteenBoard")}
          </MyText>
          <ToggleSwitch
            value={doubleTap13}
            onToggle={setDoubleTap13}
            backgroundOnColor={colors.primary}
            backgroundOffColor={colors.backgroundStrong}
            toggleColor={colors.foreground}
          />
        </View>

        <Divider backgroundColor={colors.backgroundStrong} />

        {/* 19路 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">
            {t("common.nineteenBoard")}
          </MyText>
          <ToggleSwitch
            value={doubleTap19}
            onToggle={setDoubleTap19}
            backgroundOnColor={colors.primary}
            backgroundOffColor={colors.backgroundStrong}
            toggleColor={colors.foreground}
          />
        </View>
      </View>
    </ModalShell>
  );
};
