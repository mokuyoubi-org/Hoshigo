// GameScreenSettingsModal.tsx
// 名前はGameScreenとあるが、Practice-も含む。

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import { View } from "react-native";
import { Divider, ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  onClose: () => void;
  boardSize: BoardSize;
};

export const GameScreenSettingsModal = ({ onClose, boardSize }: Props) => {
  const t = useTranslation();
  const colors = useColors();

  // 必要なもの: 音、ダブルタップ

  const { value: isSoundEnabled, setValue: setIsSoundEnabled } =
    useKVStorage<boolean>("global.sound", true);

  const { value: doubleTap, setValue: setDoubleTap } = useKVStorage<boolean>(
    `global.doubleTap${boardSize}`,
    false,
  );

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <MyText className="text-xl color-text text-center pb-4">
        {t("common.settings")}
      </MyText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {/* ダブルタップ(5路盤除く) */}
        {boardSize !== 5 && (
          <View className="flex-row justify-between items-center p-4 min-h-12">
            <MyText className="text-xl text-text">
              {t("Settings.doubleTap")}
            </MyText>
            <ToggleSwitch
              value={doubleTap}
              onToggle={setDoubleTap}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          </View>
        )}

        <Divider backgroundColor={colors.backgroundStrong} />

        {/* 音 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">{t("common.sound")}</MyText>
          <ToggleSwitch
            value={isSoundEnabled}
            onToggle={setIsSoundEnabled}
            backgroundOnColor={colors.primary}
            backgroundOffColor={colors.backgroundStrong}
            toggleColor={colors.foreground}
          />
        </View>

        <Divider backgroundColor={colors.backgroundStrong} />
      </View>
    </ModalShell>
  );
};
