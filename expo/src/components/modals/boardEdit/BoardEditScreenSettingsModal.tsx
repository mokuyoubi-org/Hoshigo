// BoardEditScreenSettingsModal

import { ShowMode } from "@/packages/go-components/src";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { Feather } from "@expo/vector-icons";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import React from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Divider, IconButton, ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  onClose: () => void;
  boardSize: BoardSize;
};

export const BoardEditScreenSettingsModal = ({ onClose, boardSize }: Props) => {
  const t = useTranslation();
  const colors = useColors();
  const { height: windowHeight } = useWindowDimensions();

  const {
    value: showOwnershipTerritoryBoard,
    setValue: setShowOwnershipTerritoryBoard,
  } = useKVStorage<boolean>(
    "BoardEditScreen.showOwnershipTerritoryBoard",
    false, // これだけはfalse。初心者くらいにしか要らないと思う
  );

  const { value: showWinRateBar, setValue: setShowWinRateBar } =
    useKVStorage<boolean>("BoardEditScreen.showWinRateBar", true);

  const { value: showCandidatesPoints, setValue: setShowCandidatesPoints } =
    useKVStorage<boolean>("BoardEditScreen.showCandidatesPoints", true);

  const { value: showMode, setValue: setShowMode } = useKVStorage<ShowMode>(
    "BoardEditScreen.showMode",
    "both",
  );

  const {
    value: showMoveEvaluationPoint,
    setValue: setShowMoveEvaluationPoint,
  } = useKVStorage<boolean>("BoardEditScreen.showMoveEvaluationPoint", true);

  const {
    value: showTerritoryResultBadge,
    setValue: setShowTerritoryResultBadge,
  } = useKVStorage<boolean>("BoardEditScreen.showTerritoryResultBadge", true);

  const { value: isSoundEnabled, setValue: setIsSoundEnabled } =
    useKVStorage<boolean>("global.sound", true);

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
          height: windowHeight * 0.5,
          borderColor: colors.backgroundStrong,
          borderWidth: 2,
          borderRadius: 16,
          backgroundColor: colors.foreground,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Ownership */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <MyText className="text-lg text-text">
            {t("Analysis.ownership")}
          </MyText>
          <IconButton
            icon={
              <Feather name={showOwnershipTerritoryBoard ? "eye" : "eye-off"} />
            }
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              setShowOwnershipTerritoryBoard(!showOwnershipTerritoryBoard);
            }}
          />
        </View>
        <Divider backgroundColor={colors.backgroundStrong} />
        {/* 2. Win Rate Bar */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <MyText className="text-lg text-text">{t("Analysis.winRate")}</MyText>
          <IconButton
            icon={<Feather name={showWinRateBar ? "eye" : "eye-off"} />}
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              setShowWinRateBar(!showWinRateBar);
            }}
          />
        </View>
        <Divider backgroundColor={colors.backgroundStrong} />
        {/* 3. Candidates */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <MyText className="text-lg text-text">
            {t("Analysis.candidates")}
          </MyText>
          <IconButton
            icon={<Feather name={showCandidatesPoints ? "eye" : "eye-off"} />}
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              setShowCandidatesPoints(!showCandidatesPoints);
            }}
          />
        </View>
        <Divider backgroundColor={colors.backgroundStrong} />
        {/* 4. Score Lead Graph */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <MyText className="text-lg text-text">
            {t("Analysis.scoreLead")}
          </MyText>
          <IconButton
            icon={<Feather name={showMode === "both" ? "eye" : "eye-off"} />}
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              setShowMode(showMode === "both" ? "slider" : "both");
            }}
          />
        </View>
        <Divider backgroundColor={colors.backgroundStrong} />
        {/* 5. Move Evaluation */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <MyText className="text-lg text-text">
            {t("Analysis.moveEvaluation")}
          </MyText>
          <IconButton
            icon={
              <Feather name={showMoveEvaluationPoint ? "eye" : "eye-off"} />
            }
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              setShowMoveEvaluationPoint(!showMoveEvaluationPoint);
            }}
          />
        </View>
        <Divider backgroundColor={colors.backgroundStrong} />
        {/* 6. showTerritoryResultBadge */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <MyText className="text-lg text-text">
            {t("Analysis.territoryResult")}
          </MyText>
          <IconButton
            icon={
              <Feather name={showTerritoryResultBadge ? "eye" : "eye-off"} />
            }
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              setShowTerritoryResultBadge(!showTerritoryResultBadge);
            }}
          />
        </View>
        <Divider backgroundColor={colors.backgroundStrong} />
        {/* 7. 音 */}
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
      </ScrollView>
    </ModalShell>
  );
};
