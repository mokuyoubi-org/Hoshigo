// DoubleTapModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { TranslationKey } from "@/src/i18n/types";
import { useKVStorage } from "kv-store";
import { Fragment } from "react";
import { View } from "react-native";
import { Divider, ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  onClose: () => void;
};

const BOARDS = [
  { key: "global.doubleTap9", labelKey: "common.nineBoard" },
  { key: "global.doubleTap13", labelKey: "common.thirteenBoard" },
  { key: "global.doubleTap19", labelKey: "common.nineteenBoard" },
] as const;

const BoardRow = ({
  keyName,
  labelKey,
}: {
  keyName: string;
  labelKey: TranslationKey;
}) => {
  const colors = useColors();
  const t = useTranslation();
  const { value, setValue } = useKVStorage<boolean>(keyName, false);

  return (
    <View className="flex-row justify-between items-center p-4 min-h-12">
      <MyText className="text-xl text-text">{t(labelKey)}</MyText>
      <ToggleSwitch
        value={value}
        onToggle={setValue}
        backgroundOnColor={colors.primary}
        backgroundOffColor={colors.backgroundStrong}
        toggleColor={colors.foreground}
      />
    </View>
  );
};

export const DoubleTapModal = ({ onClose }: Props) => {
  const colors = useColors();
  const t = useTranslation();

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
        {BOARDS.map((board, index) => (
          <Fragment key={board.key}>
            {index > 0 && (
              <Divider backgroundColor={colors.backgroundStrong} />
            )}
            <BoardRow keyName={board.key} labelKey={board.labelKey} />
          </Fragment>
        ))}
      </View>
    </ModalShell>
  );
};