// GameStartModal.tsx
import { AvatarWithPass } from "@/src/active/components/go/AvatarWithPass";
import { useTranslation } from "@/src/active/language/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { BLACK, Color, MatchType, WHITE } from "expo-goband";
import { ModalShell } from "modal-shell";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { TranslationKey } from "../../language/lang";
type Props = {
  myUsername: string;
  myIconIndex: number;
  myRankIndex: number;
  myColor: Color;
  oppUsername: string;
  oppIconIndex: number;
  oppPoints: number;
  oppColor: Color;
  matchType: MatchType;
  onClose?: () => void;
};

export const GameStartModal = ({
  myUsername,
  myIconIndex,
  myRankIndex,
  myColor,
  oppUsername,
  oppIconIndex,
  oppPoints,
  matchType,
  onClose,
}: Props) => {
  const t = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // dictionary の新しいキー形式に合わせて取得するにゃ
  const matchTypeText = t(`MatchType.matchType_${matchType}` as TranslationKey);

  const isMyBlack = myColor === BLACK;
  const blackPlayer = isMyBlack
    ? { name: myUsername, icon: myIconIndex, rankIndex: myRankIndex }
    : {
        name: oppUsername,
        icon: oppIconIndex,
        rankIndex: getRankInfo(oppPoints, t).index,
      };

  const whitePlayer = !isMyBlack
    ? { name: myUsername, icon: myIconIndex, rankIndex: myRankIndex }
    : {
        name: oppUsername,
        icon: oppIconIndex,
        rankIndex: getRankInfo(oppPoints, t).index,
      };

  return (
    <ModalShell
      backgroundColor="#f0f5f9" // background
      size="sm"
      onClose={onClose}
      style={{ alignItems: "center" }}
    >
      <Text className="text-2xl font-extrabold text-primary tracking-widest mb-4 text-center">
        {t("MatchType.title")}
      </Text>

      <View className="flex-row items-center justify-between w-full my-2 px-2">
        <View className="items-center flex-1">
          <View className="relative mb-2">
            <AvatarWithPass
              rankIndex={blackPlayer.rankIndex}
              iconIndex={blackPlayer.icon}
              size={56}
              color={BLACK}
              isLeft={true}
              showPass={false}
            />
          </View>
          <Text
            className="text-base font-bold text-text text-center"
            numberOfLines={1}
          >
            {blackPlayer.name}
          </Text>
        </View>

        <View className="items-center mx-2">
          <Text className="text-xl font-black text-primary italic">
            {t("MatchType.vs")}
          </Text>
        </View>

        <View className="items-center flex-1">
          <View className="relative mb-2">
            <AvatarWithPass
              rankIndex={whitePlayer.rankIndex}
              iconIndex={whitePlayer.icon}
              size={56}
              color={WHITE}
              isLeft={false}
              showPass={false}
            />
          </View>
          <Text
            className="text-base font-bold text-text text-center"
            numberOfLines={1}
          >
            {whitePlayer.name}
          </Text>
        </View>
      </View>

      <View className="bg-foreground mt-4 px-4 py-2 rounded-xl w-full items-center border-2 border-backgroundDark">
        <Text className="text-xs text-textSub font-semibold mb-0.5">
          {t("MatchType.handicapLabel")}
        </Text>
        <Text className="text-base font-bold text-text">{matchTypeText}</Text>
      </View>
    </ModalShell>
  );
};
