import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesome, Octicons, FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { BoardSize } from "go-core";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/i18n";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useOverlay } from "@/src/active/contexts/OverlayContext";

type Props = {
  onClose: () => void;
  boardSize: BoardSize;
};

export function PracticeResultContent({ onClose, boardSize }: Props) {
  const { hide } = useOverlay();
  const { startMatching, isMatching } = useMatching();
  const t = useTranslation();

  return (
    <View className="flex-row mt-[24px] items-center justify-center w-full gap-[32px]">
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
        <Octicons name="home" size={24} color={COLORS.textSub} />
        <Text className="text-[12px] mt-[4px] text-center" style={{ color: COLORS.textSub }}>
          {t("ResultModal.home")}
        </Text>
      </TouchableOpacity>

      {/* もう一度練習 */}
      <TouchableOpacity
        className={`items-center justify-center ${isMatching ? "opacity-40" : "opacity-100"}`}
        disabled={isMatching}
        onPress={() => {
          hide();
          router.replace("/PracticeGameScreen");
        }}
      >
        <FontAwesome name="repeat" size={22} color={COLORS.textSub} />
        <Text className="text-[12px] mt-[4px] text-center" style={{ color: COLORS.textSub }}>
          {t("common.playAgain")}
        </Text>
      </TouchableOpacity>

      {/* ランク対戦へ */}
      <TouchableOpacity
        className={`items-center justify-center ${isMatching ? "opacity-40" : "opacity-100"}`}
        disabled={isMatching}
        onPress={() => {
          hide();
          startMatching(boardSize);
        }}
      >
        <FontAwesome6 name="fire" size={22} color={COLORS.textSub} />
        <Text className="text-[12px] mt-[4px] text-center" style={{ color: COLORS.textSub }}>
          {t("common.match")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}