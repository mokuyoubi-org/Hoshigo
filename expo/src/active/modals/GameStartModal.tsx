// GameStartModal.tsx

import { useSounds } from "@/src/active/hooks/useGameSounds";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { isBot } from "@/src/stable/logics/bot/botLogics";
import { botNameFormatter } from "@/src/stable/logics/bot/botNameLogics";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BLACK, Color, MatchType, WHITE } from "go-core";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useKVStorage } from "storage-kit";
import { ModalShell } from "ui-atoms";
import { useColors } from "../hooks/useTheme";
import { AvatarWithPass } from "../components/avatar/AvatarWithPass";
import { AppText } from "../components/common/AppText";
import { useProfile } from "../contexts/ProfileContexts";


type PlayerInfo = {
  username: string;
  iconIndex: number;
  ratingOrRank: number; // myRankIndex だったり oppRating だったりするため受け取って判定できるようにする
  isRankIndex?: boolean; // すでに rankIndex の場合は true
};

type Props = {
  blackPlayer: PlayerInfo;
  whitePlayer: PlayerInfo;
  matchType: MatchType;
  onClose?: () => void;
};

export const GameStartModal = ({
  blackPlayer,
  whitePlayer,
  matchType,
  onClose,
}: Props) => {
  const colors = useColors();
  const { username } = useProfile();
  const { value: isSoundEnabled } = useKVStorage<boolean>(
    "global.sound",
    false,
  );
  const t = useTranslation();
  const { playSound } = useSounds();

  useEffect(() => {
    if (isSoundEnabled) {
      playSound("gamestart");
    }
    const timer = setTimeout(() => {
      onClose?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const matchTypeText = t(`MatchType.matchType_${matchType}`);

  // プレイヤー情報から表示用のオブジェクトを生成するヘルパー関数
  const formatPlayer = (player: PlayerInfo, color: Color) => {
    const rankIndex = player.isRankIndex
      ? player.ratingOrRank
      : getRankInfo(player.ratingOrRank, t).index;

    return {
      name: player.username,
      icon: player.iconIndex,
      rankIndex,
      color,
    };
  };

  const formattedBlack = formatPlayer(blackPlayer, BLACK);
  const formattedWhite = formatPlayer(whitePlayer, WHITE);

  // 自分が「白」の場合は白を左に配置、それ以外（自分が黒、またはどちらも自分じゃない）は黒を左に配置
  const isWhiteMe = whitePlayer.username === username;
  const leftPlayer = isWhiteMe ? formattedWhite : formattedBlack;
  const rightPlayer = isWhiteMe ? formattedBlack : formattedWhite;

  return (
    <ModalShell
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      size="sm"
      onClose={onClose}
    >
      <AppText className="text-2xl text-primary tracking-widest mb-4 text-center">
        {t("common.gameStart")}!
      </AppText>

      <View className="flex-row items-center justify-between w-full my-2 px-2">
        {/* 左側のプレイヤー */}
        <View className="items-center flex-1">
          <View className="relative mb-2">
            <AvatarWithPass
              // agehamaは不要
              rankIndex={leftPlayer.rankIndex}
              iconIndex={leftPlayer.icon}
              size={56}
              color={leftPlayer.color}
              isLeft={true}
              showPass={false}
            />
          </View>
          <View className="flex-row items-center justify-center">
            <AppText
              className="text-base text-text text-center"
              numberOfLines={1}
            >
              {botNameFormatter(leftPlayer.name, t)}
            </AppText>
            {isBot(leftPlayer.name) && (
              <MaterialCommunityIcons
                name="robot"
                size={16}
                color={colors.textSub}
                style={{
                  marginLeft: 4,
                  marginRight: 0,
                }}
              />
            )}
          </View>
        </View>

        <View className="items-center mx-2">
          <AppText className="text-xl text-primary italic">VS</AppText>
        </View>

        {/* 右側のプレイヤー */}
        <View className="items-center flex-1">
          <View className="relative mb-2">
            <AvatarWithPass
              // agehamaは不要
              rankIndex={rightPlayer.rankIndex}
              iconIndex={rightPlayer.icon}
              size={56}
              color={rightPlayer.color}
              isLeft={false}
              showPass={false}
            />
          </View>

          <View className="flex-row items-center justify-center">
            <AppText
              className="text-base text-text text-center"
              numberOfLines={1}
            >
              {botNameFormatter(rightPlayer.name, t)}
            </AppText>
            {isBot(rightPlayer.name) && (
              <MaterialCommunityIcons
                name="robot"
                size={16}
                color={colors.textSub}
                style={{
                  marginLeft: 4,
                  marginRight: 0,
                }}
              />
            )}
          </View>
        </View>
      </View>

      <View className="bg-foreground mt-4 px-4 py-2 rounded-xl w-full items-center border-2 border-backgroundStrong">
        <AppText className="text-sm text-textSub mb-0.5">
          {t("MatchType.handicap")}
        </AppText>
        <AppText className="text-base text-text">{matchTypeText}</AppText>
      </View>
    </ModalShell>
  );
};
