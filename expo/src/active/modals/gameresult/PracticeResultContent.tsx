// PracticeResultContent.tsx

import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useColors } from "@/src/active/hooks/useTheme";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { FontAwesome, FontAwesome6, Octicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { BoardSize } from "go-core";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { AppText } from "../../components/common/AppText";

type Props = {
  onClose: () => void;
  boardSize: BoardSize;
};

export function PracticeResultContent({ onClose, boardSize }: Props) {
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
        <AppText
          className="text-sm mt-1 text-center"
          style={{ color: colors.textSub }}
        >
          {t("common.home")}
        </AppText>
      </TouchableOpacity>

      {/* もう一度練習 */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => {
          hide();
          router.replace("/PracticeGameScreen");
        }}
      >
        <FontAwesome name="repeat" size={22} color={colors.textSub} />
        <AppText
          className="text-sm mt-1 text-center"
          style={{ color: colors.textSub }}
        >
          {t("common.playAgain")}
        </AppText>
      </TouchableOpacity>

      {/* ランク対戦へ */}
      <TouchableOpacity
        className="items-center justify-center"
        disabled={isMatching}
        onPress={() => {
          startMatching(boardSize);
        }}
      >
        <FontAwesome6
          name="fire"
          size={22}
          color={!isMatching ? colors.textSub : colors.backgroundStrong}
        />
        <AppText
          className="text-sm mt-1 text-center"
          style={{
            color: !isMatching ? colors.textSub : colors.backgroundStrong,
          }}
        >
          {t("common.match")}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
