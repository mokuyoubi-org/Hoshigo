// GameStartModal.tsx
import { AvatarWithPass } from "@/src/active/components/go/AvatarWithPass";
import { useTranslation } from "@/src/active/language/i18n";
import { botNameFormatter, isBot } from "@/src/stable/logics/botNameLogics";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // アイコンのインポートを追加
import { Color, MatchType } from "expo-goband";
import { ModalShell } from "modal-shell";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { TranslationKey } from "../../language/lang";

type Props = {
  myUsername: string;
  myIconIndex: number;
  myRankIndex: number;
  myColor: Color;
  oppUsername: string;
  oppIconIndex: number;
  oppRating: number;
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
  oppRating,
  oppColor,
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

  // dictionary の新しいキー形式に合わせて取得する
  const matchTypeText = t(`MatchType.matchType_${matchType}` as TranslationKey);

  // 自分（左）と相手（右）のデータを整理
  const leftPlayer = {
    name: myUsername,
    icon: myIconIndex,
    rankIndex: myRankIndex,
    color: myColor,
  };

  const rightPlayer = {
    name: oppUsername,
    icon: oppIconIndex,
    rankIndex: getRankInfo(oppRating, t).index,
    color: oppColor,
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
        {/* 自分（左） */}
        <View className="items-center flex-1">
          <View className="relative mb-2">
            <AvatarWithPass
              rankIndex={leftPlayer.rankIndex}
              iconIndex={leftPlayer.icon}
              size={56}
              color={leftPlayer.color}
              isLeft={true}
              showPass={false}
            />
          </View>
          <Text
            className="text-base font-bold text-text text-center"
            numberOfLines={1}
          >
            {leftPlayer.name}
          </Text>
        </View>

        <View className="items-center mx-2">
          <Text className="text-xl font-black text-primary italic">
            {t("MatchType.vs")}
          </Text>
        </View>

        {/* 相手（右） */}
        <View className="items-center flex-1">
          <View className="relative mb-2">
            <AvatarWithPass
              rankIndex={rightPlayer.rankIndex}
              iconIndex={rightPlayer.icon}
              size={56}
              color={rightPlayer.color}
              isLeft={false}
              showPass={false}
            />
          </View>

          {/* 名前とボットマークを表示する部分 */}
          <View className="flex-row items-center justify-center">
            <Text
              className="text-base font-bold text-text text-center"
              numberOfLines={1}
            >
              {botNameFormatter(rightPlayer.name, t)}
            </Text>
            {isBot(rightPlayer.name) && (
              <MaterialCommunityIcons
                name="robot"
                size={14}
                color={COLORS.textSub}
                style={{
                  marginLeft: 4,
                  marginRight: 0,
                }}
              />
            )}
          </View>
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
