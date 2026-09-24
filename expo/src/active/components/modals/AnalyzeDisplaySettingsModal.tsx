import { useTranslation } from "@/src/active/i18n";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { useKVStorage } from "storage-kit";
import { IconButton, ModalShell } from "ui-atoms";
import { COLORS } from "../../constants/colors";

type Props = {
  onClose: () => void;
};

export function AnalyzeDisplaySettingsModal({ onClose }: Props) {
  const t = useTranslation();

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

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      style={{ alignItems: "center", gap: 16 }}
    >
      <Text className="text-xl font-bold color-text text-center pb-4">
        {t("common.settings")}
      </Text>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {/* 1. Ownership */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("Analysis.ownership")}
          </Text>
          {isShowOwnershipTerritoryBoardLoaded && (
            <IconButton
              icon={
                <Feather
                  name={showOwnershipTerritoryBoard ? "eye" : "eye-off"}
                />
              }
              color={COLORS.primary}
              onPress={() => {
                setShowOwnershipTerritoryBoard(!showOwnershipTerritoryBoard);
              }}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* 2. Win Rate Bar */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("Analysis.winRate")}
          </Text>
          {isShowWinRateBarLoaded && (
            <IconButton
              icon={<Feather name={showWinRateBar ? "eye" : "eye-off"} />}
              color={COLORS.primary}
              onPress={() => {
                setShowWinRateBar(!showWinRateBar);
              }}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* 3. Candidates */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("Analysis.candidates")}
          </Text>
          {isShowCandidatesPointsLoaded && (
            <IconButton
              icon={<Feather name={showCandidatesPoints ? "eye" : "eye-off"} />}
              color={COLORS.primary}
              onPress={() => {
                setShowCandidatesPoints(!showCandidatesPoints);
              }}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* 4. Score Lead Graph */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("Analysis.scoreLead")}
          </Text>
          {isShowScoreLeadGraphLoaded && (
            <IconButton
              icon={<Feather name={showScoreLeadGraph ? "eye" : "eye-off"} />}
              color={COLORS.primary}
              onPress={() => {
                setShowScoreLeadGraph(!showScoreLeadGraph);
              }}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* 5. Move Evaluation */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("Analysis.moveEvaluation")}
          </Text>
          {isShowMoveEvaluationPointLoaded && (
            <IconButton
              icon={
                <Feather name={showMoveEvaluationPoint ? "eye" : "eye-off"} />
              }
              color={COLORS.primary}
              onPress={() => {
                setShowMoveEvaluationPoint(!showMoveEvaluationPoint);
              }}
            />
          )}
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />
      </View>
    </ModalShell>
  );
}
