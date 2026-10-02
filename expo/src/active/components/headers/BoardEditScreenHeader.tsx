import { useTranslation } from "@/src/active/i18n/LangProvider";
import { RecordType } from "@/src/active/types/record";
import { isBot } from "@/src/stable/logics/bot/botLogics";
import { botNameFormatter } from "@/src/stable/logics/bot/botNameLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BLACK, Color, MatchType } from "go-core";
import React from "react";
import { View } from "react-native";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { AvatarWithPass } from "../common/AvatarWithPass";

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
  record: RecordType;
  leftPlayer: HeaderPlayerInfo;
  rightPlayer: HeaderPlayerInfo;
  playerWin?: boolean;
  matchType: MatchType;
  currentIndex: number;
  showWinRateBar?: boolean;
};

export const BoardEditScreenHeader = React.memo(function BoardEditScreenHeader({
  record,
  leftPlayer,
  rightPlayer,
  currentIndex,
  showWinRateBar = true,
}: Props) {
  const colors = useColors();
  // const { lang } = useLang();
  // const fontFamily = useAppFont();
  const t = useTranslation();

  // 勝率データ
  const currentWinRate =
    record.analysis?.perMove?.[currentIndex]?.winRate ?? null;
  const hasAnalysis = record.analysis != null && currentWinRate != null;

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
    leftPct >= 10 ? textOnBar(leftIsBlack) : textOnBar(rightIsBlack);
  const rightNumberColor =
    rightPct >= 10 ? textOnBar(rightIsBlack) : textOnBar(leftIsBlack);

  const leftUsername = leftPlayer.username ?? "";
  const rightUsername = rightPlayer.username ?? "";

  return (
    <View className="w-full p-2">
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
              <AppText
                className="text-lg text-text shrink"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isBot(leftUsername)
                  ? botNameFormatter(leftUsername, t)
                  : (leftPlayer.username ?? "user")}
              </AppText>
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
              <AppText
                className="text-lg text-text shrink"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isBot(rightUsername)
                  ? botNameFormatter(rightUsername, t)
                  : (rightPlayer.username ?? "user")}
              </AppText>
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
            <View className="w-full h-6 flex-row rounded-full overflow-hidden bg-gray-200">
              <View
                style={{
                  width: `${leftPct}%`,
                  backgroundColor: leftBarColor,
                }}
              />
              <View
                style={{
                  width: `${rightPct}%`,
                  backgroundColor: rightBarColor,
                }}
              />
              {/* 数字のレイヤー（バーの上に重ねる） */}
              <View className="absolute inset-0 flex-row items-center justify-between px-2 pointer-events-none">
                <AppText className="text-sm" style={{ color: leftNumberColor }}>
                  {leftPct}%
                </AppText>
                <AppText
                  className="text-sm"
                  style={{ color: rightNumberColor }}
                >
                  {rightPct}%
                </AppText>
              </View>
            </View>
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
});

BoardEditScreenHeader.displayName = "BoardEditScreenHeader";
