// GameStartModal.tsx

import { COLORS } from "@/src/active/constants/colors";
import { useSounds } from "@/src/active/hooks/useGameSounds";
import { useTranslation } from "@/src/active/i18n";
import { botNameFormatter } from "@/src/stable/logics/bot/botNameLogics";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BLACK, Color, MatchType, WHITE } from "go-core";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { useKVStorage } from "storage-kit";
import { ModalShell } from "ui-atoms";
import { useProfile } from "../../contexts/ProfileContexts";
import { AvatarWithPass } from "../common/AvatarWithPass";
import { isBot } from "@/src/stable/logics/bot/botLogics";

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
      backgroundColor="#f0f5f9"
      size="sm"
      onClose={onClose}
      style={{ alignItems: "center" }}
    >
      <Text className="text-2xl font-extrabold text-primary tracking-widest mb-4 text-center">
        {t("MatchType.title")}
      </Text>

      <View className="flex-row items-center justify-between w-full my-2 px-2">
        {/* 左側のプレイヤー */}
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
          <View className="flex-row items-center justify-center">
            <Text
              className="text-base font-bold text-text text-center"
              numberOfLines={1}
            >
              {botNameFormatter(leftPlayer.name, t)}
            </Text>
            {isBot(leftPlayer.name) && (
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

        <View className="items-center mx-2">
          <Text className="text-xl font-black text-primary italic">
            {t("MatchType.vs")}
          </Text>
        </View>

        {/* 右側のプレイヤー */}
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
        <Text className="text-sm text-textSub font-semibold mb-0.5">
          {t("MatchType.handicapLabel")}
        </Text>
        <Text className="text-base font-bold text-text">{matchTypeText}</Text>
      </View>
    </ModalShell>
  );
};
