// PracticeResultContent.tsx

import { useMatching } from "@/src/contexts/MatchingContext";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { FontAwesome, FontAwesome6, Octicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { BoardSize, Grid, MatchType, RecordAnalysis } from "go-core";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MyText } from "../../common/MyText";

type Props = {
  onClose: () => void;
  boardSize: BoardSize;
  matchType: MatchType;
  moves: Grid[];
  analysis?: RecordAnalysis;
};

export const PracticeResultContent = ({
  onClose,
  boardSize,
  matchType,
  moves,
  analysis,
}: Props) => {
  const colors = useColors();
  const { hide } = useOverlay();
  const { startMatching, isMatching } = useMatching();
  const t = useTranslation();

  return (
    <View className="flex-row mt-6 items-center justify-center w-full gap-8">
      {/* ホームボタン */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => {
          onClose();
          setTimeout(() => {
            router.replace({ pathname: "/HomeScreen" });
          }, 0);
        }}
      >
        <Octicons name="home" size={24} color={colors.textSub} />
        <MyText
          className="text-sm mt-1 text-center"
          style={{ color: colors.textSub }}
        >
          {t("common.home")}
        </MyText>
      </TouchableOpacity>

      {/* もう一度練習 */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => {
          hide();

          router.push({
            pathname: "/PracticeGameScreen",
            params: {
              matchTypeParam: matchType,
              boardSizeParam: boardSize,
              movesP: moves,
              analysisP: JSON.stringify(analysis),
            },
          });

          // 2026/10/05: ⚠️pushでいい
        }}
      >
        <FontAwesome name="repeat" size={22} color={colors.textSub} />
        <MyText
          className="text-sm mt-1 text-center"
          style={{ color: colors.textSub }}
        >
          {t("common.playAgain")}
        </MyText>
      </TouchableOpacity>

      {/* ランク対戦へ */}
      <TouchableOpacity
        className="items-center justify-center"
        disabled={isMatching}
        onPress={() => {
          startMatching(boardSize === 5 ? 9 : boardSize); // 5路盤であれば9路盤に
        }}
      >
        <FontAwesome6
          name="fire"
          size={22}
          color={!isMatching ? colors.textSub : colors.backgroundStrong}
        />
        <MyText
          className="text-sm mt-1 text-center"
          style={{
            color: !isMatching ? colors.textSub : colors.backgroundStrong,
          }}
        >
          {t("common.match")}
        </MyText>
      </TouchableOpacity>
    </View>
  );
};
