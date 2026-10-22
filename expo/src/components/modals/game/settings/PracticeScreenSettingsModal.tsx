// PracticeScreenSettingsModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { ShowMode } from "go-components";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import { ScrollView, useWindowDimensions } from "react-native";
import { Divider, ModalShell } from "ui-atoms";
import { SwitchRow } from "./SwitchRow";

type Props = {
  onClose: () => void;
  boardSize: BoardSize;
  // スコアリード(グラフ)は bot vs bot の時にしか画面に出ないので、その時だけ設定を見せる
  isBotBot: boolean;
};

export const PracticeScreenSettingsModal = ({
  onClose,
  boardSize,
  isBotBot,
}: Props) => {
  const t = useTranslation();
  const colors = useColors();
  const { height: windowHeight } = useWindowDimensions();

  const { value: showOwnership, setValue: setShowOwnershipTerritoryBoard } =
    useKVStorage<boolean>("PracticeScreen.showOwnership", true);

  const { value: showWinRateBar, setValue: setShowWinRateBar } =
    useKVStorage<boolean>("PracticeScreen.showWinRateBar", true);

  const { value: showMode, setValue: setShowMode } = useKVStorage<ShowMode>(
    "PracticeScreen.showMode",
    "both",
  );

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

      <ScrollView
        style={{
          maxHeight: windowHeight * 0.5,
          borderColor: colors.backgroundStrong,
          borderWidth: 2,
          borderRadius: 16,
          backgroundColor: colors.foreground,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isBotBot && (
          <>
            {/* 1. 勝率バー */}
            <SwitchRow
              label={t("Analysis.winRate")}
              value={showWinRateBar}
              onToggle={setShowWinRateBar}
            />
            <Divider backgroundColor={colors.backgroundStrong} />

            {/* 2. 陣地マップ */}
            <SwitchRow
              label={t("Analysis.ownership")}
              value={showOwnership}
              onToggle={setShowOwnershipTerritoryBoard}
            />
            <Divider backgroundColor={colors.backgroundStrong} />

            {/* 3. 着手評価: なし */}

            {/* 4. 陣地グラフ */}
            <SwitchRow
              label={t("Analysis.scoreLead")}
              value={showMode === "both"}
              onToggle={(v) => setShowMode(v ? "both" : "slider")}
            />
            <Divider backgroundColor={colors.backgroundStrong} />
          </>
        )}
        <SwitchRow
          label={t("common.sound")}
          value={isSoundEnabled}
          onToggle={setIsSoundEnabled}
        />
        <Divider backgroundColor={colors.backgroundStrong} />
        <SwitchRow
          label={t("Settings.doubleTap")}
          value={doubleTap}
          onToggle={setDoubleTap}
        />
      </ScrollView>
    </ModalShell>
  );
};
