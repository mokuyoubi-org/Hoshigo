import { COLORS } from "@/src/active/constants/colors";
import { useLang, useTranslation } from "@/src/active/i18n";
import { RecordType } from "@/src/active/types/record";
import { isBot } from "@/src/stable/logics/bot/botLogics";
import { botNameFormatter } from "@/src/stable/logics/bot/botNameLogics";
import {
  matchTypeToText,
  resultToCommentSimple,
  resultToObjectiveComment,
  resultToSubjectiveComment,
} from "@/src/stable/logics/textFormatter";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Agehama } from "go-components";
import { BLACK, Color, MatchType } from "go-core";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { AvatarWithPass } from "./AvatarWithPass";

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
  simpleComment?: boolean;
  matchType: MatchType;
  currentIndex: number;
  showWinRateBar?: boolean;
  practiceMatchStatus?: string;
};

export const RecordCardHeader = React.memo(function RecordCardHeader({
  record,
  leftPlayer,
  rightPlayer,
  playerWin,
  simpleComment = true,
  matchType,
  currentIndex,
  showWinRateBar = true,
  practiceMatchStatus = "human_human",
}: Props) {
  const { lang } = useLang();
  const t = useTranslation();

  // Botの表情決定
  let botFace: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    "robot";
  if (playerWin === true) botFace = "robot-dead";
  else if (playerWin === false) botFace = "robot-excited";

  const resultText = useMemo(
    () =>
      practiceMatchStatus === "human_bot"
        ? (resultToObjectiveComment(record.result ?? "", t) ??
          t("common.unknown"))
        : simpleComment
          ? (resultToCommentSimple(record.result ?? "", t) ??
            t("common.unknown"))
          : (resultToSubjectiveComment(
              record.result ?? "",
              leftPlayer.color,
              t,
            ) ?? t("common.unknown")),
    [record.result, leftPlayer.color, simpleComment, t],
  );

  const dateText = useMemo(
    () =>
      record.created_at
        ? new Date(record.created_at).toLocaleDateString(lang, {
            month: "short",
            day: "numeric",
          })
        : "",
    [record.created_at, lang],
  );

  const accentColor =
    playerWin === true
      ? COLORS.green
      : playerWin === false
        ? COLORS.coral
        : COLORS.text;

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

  const leftUsername = leftPlayer.username ?? "";
  const rightUsername = rightPlayer.username ?? "";

  return (
    <View className="w-full rounded-2xl p-2 bg-white/5">
      <View className="w-full flex-row items-center justify-between gap-2">
        {/* 1. 左アイコン */}
        <AvatarWithPass
          rankIndex={leftPlayer.rankIndex ?? 0}
          iconIndex={leftPlayer.iconIndex ?? 0}
          size={48}
          color={leftPlayer.color}
          isLeft={true}
          showPass={leftPlayer.showPass}
        />

        {/* 2. 中央エリア */}
        <View className="flex-1 flex-col justify-center min-w-0">
          <View className="w-full flex-row items-center justify-between min-w-0">
            {/* 左情報：幅を固定（w-[80px]）にする */}
            <View className="w-[80px] flex-col items-start min-w-0">
              <View className="flex-row items-center w-full">
                <Text
                  className="text-base font-bold text-text shrink"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isBot(leftUsername)
                    ? botNameFormatter(leftUsername, t)
                    : (leftPlayer.username ?? "user")}
                </Text>
                {isBot(leftUsername) && (
                  <MaterialCommunityIcons
                    name={botFace}
                    size={12}
                    color={COLORS.textSub}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
              <Agehama
                count={leftPlayer.agehama}
                backgroundColor={COLORS.backgroundDark}
                disabledColor={COLORS.background}
                textColor={COLORS.textSub}
              />
            </View>

            {/* 中央情報：flex-1 で残りのスペースを全部使う */}
            <View className="flex-1 flex-col items-center justify-center min-w-0 px-1">
              <Text
                className={`${simpleComment ? "text-sm" : "text-xs"} font-bold text-center leading-[15px]`}
                style={{ color: simpleComment ? accentColor : COLORS.textSub }}
                numberOfLines={1}
              >
                {resultText}
              </Text>
              <Text
                className="text-[9px] text-center pt-1"
                style={{ color: COLORS.textSub }}
                numberOfLines={1}
              >
                {dateText !== "" && `${dateText} • `}
                {matchTypeToText(matchType, t)}
              </Text>
            </View>

            {/* 右情報：幅を固定（w-[80px]）にする */}
            <View className="w-[80px] flex-col items-end min-w-0">
              <View className="flex-row items-center justify-end w-full">
                <Text
                  className="text-base font-bold text-text shrink"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isBot(rightUsername)
                    ? botNameFormatter(rightUsername, t)
                    : (rightPlayer.username ?? "user")}
                </Text>
                {isBot(rightUsername) && (
                  <MaterialCommunityIcons
                    name={botFace}
                    size={12}
                    color={COLORS.textSub}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
              <Agehama
                count={rightPlayer.agehama}
                backgroundColor={COLORS.backgroundDark}
                disabledColor={COLORS.background}
                textColor={COLORS.textSub}
              />
            </View>
          </View>

          {/* 下段：勝率ゲージ */}
          {hasAnalysis && showWinRateBar && (
            <View className="w-full flex-row items-center mt-1">
              <Text
                className="text-[9px] font-bold w-[32px] text-right pr-0.5"
                style={{ color: COLORS.text }}
              >
                {leftPct}%
              </Text>
              <View className="flex-1 h-1.5 flex-row rounded-full overflow-hidden mx-1 bg-gray-200">
                <View
                  style={{
                    width: `${leftPct}%`,
                    backgroundColor:
                      leftPlayer.color === BLACK
                        ? COLORS.darkObjectAccent
                        : COLORS.lightObject,
                  }}
                />
                <View
                  style={{
                    width: `${rightPct}%`,
                    backgroundColor:
                      rightPlayer.color === BLACK
                        ? COLORS.darkObjectAccent
                        : COLORS.lightObject,
                  }}
                />
              </View>
              <Text
                className="text-[9px] font-bold w-[32px] text-left pl-0.5"
                style={{ color: COLORS.textSub }}
              >
                {rightPct}%
              </Text>
            </View>
          )}
        </View>

        {/* 3. 右アイコン */}
        <AvatarWithPass
          rankIndex={rightPlayer.rankIndex ?? 0}
          iconIndex={rightPlayer.iconIndex ?? 0}
          size={48}
          color={rightPlayer.color}
          isLeft={false}
          showPass={rightPlayer.showPass}
        />
      </View>
    </View>
  );
});

RecordCardHeader.displayName = "RecordCardHeader";
