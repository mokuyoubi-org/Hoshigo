import { useTranslation } from "@/src/active/i18n/LangProvider";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { useKVStorage } from "storage-kit";
import { IconButton, ModalShell } from "ui-atoms";

import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { Divider } from "../common/Divider";

type Props = {
  onClose: () => void;
};

export function AnalyzeDisplaySettingsModal({ onClose }: Props) {
  const t = useTranslation();
  const colors = useColors();
  const {
    value: showOwnershipTerritoryBoard,
    setValue: setShowOwnershipTerritoryBoard,
    isLoaded: isShowOwnershipTerritoryBoardLoaded,
  } = useKVStorage<boolean>(
    "BoardEditScreen.showOwnershipTerritoryBoard",
    false, // これだけはfalse。初心者くらいにしか要らないと思う
  );

  const {
    value: showWinRateBar,
    setValue: setShowWinRateBar,
    isLoaded: isShowWinRateBarLoaded,
  } = useKVStorage<boolean>("BoardEditScreen.showWinRateBar", true);

  const {
    value: showCandidatesPoints,
    setValue: setShowCandidatesPoints,
    isLoaded: isShowCandidatesPointsLoaded,
  } = useKVStorage<boolean>("BoardEditScreen.showCandidatesPoints", true);

  const {
    value: showScoreLeadGraph,
    setValue: setShowScoreLeadGraph,
    isLoaded: isShowScoreLeadGraphLoaded,
  } = useKVStorage<boolean>("BoardEditScreen.showScoreLeadGraph", true);

  const {
    value: showMoveEvaluationPoint,
    setValue: setShowMoveEvaluationPoint,
    isLoaded: isShowMoveEvaluationPointLoaded,
  } = useKVStorage<boolean>("BoardEditScreen.showMoveEvaluationPoint", true);
  const {
    value: showTerritoryResultBadge,
    setValue: setShowTerritoryResultBadge,
    isLoaded: isShowTerritoryResultBadgeLoaded,
  } = useKVStorage<boolean>("BoardEditScreen.showTerritoryResultBadge", true);
  return (
    <ModalShell
      onClose={onClose}
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundDark}
    >
      <AppText className="text-xl color-text text-center pb-4">
        {t("common.settings")}
      </AppText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {/* 1. Ownership */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("Analysis.ownership")}
          </AppText>
          {isShowOwnershipTerritoryBoardLoaded && (
            <IconButton
              icon={
                <Feather
                  name={showOwnershipTerritoryBoard ? "eye" : "eye-off"}
                />
              }
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundDark}
              onPress={() => {
                setShowOwnershipTerritoryBoard(!showOwnershipTerritoryBoard);
              }}
            />
          )}
        </View>
        <Divider />
        {/* 2. Win Rate Bar */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("Analysis.winRate")}
          </AppText>
          {isShowWinRateBarLoaded && (
            <IconButton
              icon={<Feather name={showWinRateBar ? "eye" : "eye-off"} />}
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundDark}
              onPress={() => {
                setShowWinRateBar(!showWinRateBar);
              }}
            />
          )}
        </View>
        <Divider />
        {/* 3. Candidates */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("Analysis.candidates")}
          </AppText>
          {isShowCandidatesPointsLoaded && (
            <IconButton
              icon={<Feather name={showCandidatesPoints ? "eye" : "eye-off"} />}
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundDark}
              onPress={() => {
                setShowCandidatesPoints(!showCandidatesPoints);
              }}
            />
          )}
        </View>
        <Divider />
        {/* 4. Score Lead Graph */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("Analysis.scoreLead")}
          </AppText>
          {isShowScoreLeadGraphLoaded && (
            <IconButton
              icon={<Feather name={showScoreLeadGraph ? "eye" : "eye-off"} />}
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundDark}
              onPress={() => {
                setShowScoreLeadGraph(!showScoreLeadGraph);
              }}
            />
          )}
        </View>
        <Divider />
        {/* 5. Move Evaluation */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("Analysis.moveEvaluation")}
          </AppText>
          {isShowMoveEvaluationPointLoaded && (
            <IconButton
              icon={
                <Feather name={showMoveEvaluationPoint ? "eye" : "eye-off"} />
              }
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundDark}
              onPress={() => {
                setShowMoveEvaluationPoint(!showMoveEvaluationPoint);
              }}
            />
          )}
        </View>
        <Divider />
        {/* 6. showTerritoryResultBadge */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("Analysis.territoryResult")}
          </AppText>
          {isShowTerritoryResultBadgeLoaded && (
            <IconButton
              icon={
                <Feather name={showTerritoryResultBadge ? "eye" : "eye-off"} />
              }
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundDark}
              onPress={() => {
                setShowTerritoryResultBadge(!showTerritoryResultBadge);
              }}
            />
          )}
        </View>
        <Divider />
      </View>
    </ModalShell>
  );
}
