// BoardEditScreenHeader.tsx

import { MixedText } from "@/src/components/common/MixedText";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { isBot } from "@/src/logics/bot/botLogics";
import { nameFormatter } from "@/src/logics/bot/botNameLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WinRateBar } from "go-components";
import { BLACK, Color, RecordAnalysis } from "go-core";
import React from "react";
import { View } from "react-native";
import { AvatarWithPass } from "../avatar/AvatarWithPass";

// アバターの大きさ
const AVATAR_SIZE = 60;

// color の型を `Color` (go-coreの型) にした
export type HeaderPlayerInfo = {
  username?: string;
  rankIndex?: number;
  iconIndex?: number;
  color: Color;
  agehama: number;
  showPass: boolean;
};

type Props = {
  analysis?: RecordAnalysis | null;
  leftPlayer: HeaderPlayerInfo;
  rightPlayer: HeaderPlayerInfo;
  currentIndex: number;
  showWinRateBar?: boolean;
};

export const BoardEditScreenHeader = React.memo(
  ({
    analysis,
    leftPlayer,
    rightPlayer,
    currentIndex,
    showWinRateBar = true,
  }: Props) => {
    const colors = useColors();
    const t = useTranslation();
    const fontFamily = useAppFont();

    // 勝率データ
    const currentWinRate = analysis?.perMove?.[currentIndex]?.winRate ?? null;
    const hasAnalysis = analysis != null && currentWinRate != null;

    const blackPct =
      currentWinRate != null
        ? Math.round(Math.min(Math.max(currentWinRate, 0), 100))
        : 50;
    const leftPct = leftPlayer.color === BLACK ? blackPct : 100 - blackPct;
    const rightPct = 100 - leftPct;

    // バーの色と、バーの中に入れる数字の色
    const leftIsBlack = leftPlayer.color === BLACK;
    const rightIsBlack = rightPlayer.color === BLACK;
    const leftBarColor = leftIsBlack ? colors.primaryDark : colors.whiteStone;
    const rightBarColor = rightIsBlack ? colors.primaryDark : colors.whiteStone;
    // 黒い帯の上には白っぽい文字、白い帯の上には黒っぽい文字
    const textOnBar = (isBlack: boolean) =>
      isBlack ? colors.whiteStone : colors.primaryDark;
    // 帯が細すぎて数字がはみ出すときは、下にある相手側の帯の色に合わせる
    const leftNumberColor =
      leftPct >= 3 ? textOnBar(leftIsBlack) : textOnBar(rightIsBlack);
    const rightNumberColor =
      rightPct >= 10 ? textOnBar(rightIsBlack) : textOnBar(leftIsBlack);

    const leftUsername = leftPlayer.username ?? "";
    const rightUsername = rightPlayer.username ?? "";

    return (
      <View className="w-full">
        <View className="w-full flex-row items-center justify-between gap-2">
          {/* 1. 左アイコン */}
          <View className="relative">
            <AvatarWithPass
              rankIndex={leftPlayer.rankIndex ?? 0}
              iconIndex={leftPlayer.iconIndex ?? 0}
              size={AVATAR_SIZE}
              color={leftPlayer.color}
              isLeft={true}
              showPass={leftPlayer.showPass}
              agehama={leftPlayer.agehama}
            />
          </View>

          {/* 2. 中央エリア */}
          <View className="flex-1 min-w-0 flex-col justify-center gap-1">
            {/* 1行目: username - username */}
            <View className="w-full flex-row items-center justify-between gap-2 min-w-0">
              {/* 左ユーザー名 */}
              <View className="flex-1 flex-row items-center justify-start">
                <MixedText
                  className="text-lg text-text shrink"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {nameFormatter(leftUsername, t)}
                </MixedText>
                {isBot(leftUsername) && (
                  <MaterialCommunityIcons
                    name={"robot"}
                    size={16}
                    color={colors.textSub}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>

              {/* 右ユーザー名 */}
              <View className="flex-1 flex-row items-center justify-end">
                <MixedText
                  className="text-lg text-text shrink"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {nameFormatter(rightUsername, t)}
                </MixedText>
                {isBot(rightUsername) && (
                  <MaterialCommunityIcons
                    name={"robot"}
                    size={16}
                    color={colors.textSub}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
            </View>

            {/* 4行目: 勝率バー（数字はバーの中） */}
            {hasAnalysis && showWinRateBar && (
              <WinRateBar
                leftPct={leftPct}
                rightPct={rightPct}
                leftBarColor={leftBarColor}
                rightBarColor={rightBarColor}
                leftNumberColor={leftNumberColor}
                rightNumberColor={rightNumberColor}
                fontFamily={fontFamily}
              />
            )}
          </View>

          {/* 3. 右アイコン + アゲハマのバッジ */}
          <View className="relative">
            <AvatarWithPass
              rankIndex={rightPlayer.rankIndex ?? 0}
              iconIndex={rightPlayer.iconIndex ?? 0}
              size={AVATAR_SIZE}
              color={rightPlayer.color}
              isLeft={false}
              showPass={rightPlayer.showPass}
              agehama={rightPlayer.agehama}
            />
          </View>
        </View>
      </View>
    );
  },
);

BoardEditScreenHeader.displayName = "BoardEditScreenHeader";
