// GameScreenSettingsModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import { View } from "react-native";
import { Divider, ModalShell } from "ui-atoms";
import { SwitchRow } from "./SwitchRow";

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
          <>
            <SwitchRow
              label={t("Settings.doubleTap")}
              value={doubleTap}
              onToggle={setDoubleTap}
            />
            <Divider backgroundColor={colors.backgroundStrong} />
          </>
        )}

        {/* 音 */}
        <SwitchRow
          label={t("common.sound")}
          value={isSoundEnabled}
          onToggle={setIsSoundEnabled}
        />
      </View>
    </ModalShell>
  );
};
