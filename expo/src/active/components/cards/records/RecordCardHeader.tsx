import { COLORS } from "@/src/active/constants/colors";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useLang, useTranslation } from "@/src/active/language/i18n";
import { RecordType } from "@/src/active/types/record";
import { botNameFormatter, isBot } from "@/src/stable/logics/botNameLogics";
import {
  matchTypeToText,
  resultToComment,
  resultToCommentSimple,
} from "@/src/stable/logics/textFormatter";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Agehama, BLACK, MatchType, WHITE } from "expo-goband";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { AgehamaDisplay } from "../../go/Agehama";
import { AvatarWithPass } from "../../go/AvatarWithPass";

type HeaderProps = {
  record: RecordType;
  isPlayerBlack?: boolean;
  playerWin?: boolean;
  isBlackPass: boolean;
  isWhitePass: boolean;
  currentAgehama: Agehama;
  simpleComment?: boolean;
  matchType: MatchType;
  currentIndex: number;
  showWinRateBar?: boolean;
};

export const RecordCardHeader = React.memo(function RecordCardHeader({
  record,
  isPlayerBlack,
  playerWin,
  isBlackPass,
  isWhitePass,
  currentAgehama,
  simpleComment = true,
  matchType,
  currentIndex,
  showWinRateBar = true,
}: HeaderProps) {
  const { lang } = useLang();
  const t = useTranslation();
  const { iconIndex, username } = useProfile();

  const self = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? blackVal : whiteVal;
  const opp = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? whiteVal : blackVal;

  // Botの表情決定
  let botFace: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    "robot";
  if (playerWin === true) botFace = "robot-dead";
  else if (playerWin === false) botFace = "robot-excited";

  const resultText = useMemo(
    () =>
      simpleComment
        ? (resultToCommentSimple(record.result ?? "", t) ??
          t("MyRecords.unknown"))
        : (resultToComment(
            record.result ?? "",
            isPlayerBlack ? BLACK : WHITE,
            t,
          ) ?? t("MyRecords.unknown")),
    [record.result, isPlayerBlack, t],
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

  // 勝率計算（自分/相手）
  const blackPct =
    currentWinRate != null
      ? Math.round(Math.min(Math.max(currentWinRate, 0), 100))
      : 50;
  const whitePct = 100 - blackPct;
  const leftPct = isPlayerBlack ? blackPct : whitePct;
  const rightPct = isPlayerBlack ? whitePct : blackPct;
  const leftBarWidth = isPlayerBlack ? blackPct : whitePct;

  const opponentUsername = opp(record.black_username, record.white_username);

  return (
    <View className="w-full rounded-2xl p-2 bg-white/5">
      {/* 左右のアバターに全体を挟み込む横並びレイアウト */}
      <View className="w-full flex-row items-center justify-between gap-2">
        {/* 1. 左アイコン（自分） */}
        <AvatarWithPass
          rankIndex={
            self(record.black_rank_index, record.white_rank_index) ?? 0
          }
          iconIndex={iconIndex ?? 0}
          size={48}
          color={isPlayerBlack ? BLACK : WHITE}
          isLeft={true}
          showPass={isPlayerBlack ? isBlackPass : isWhitePass}
        />

        {/* 2. 中央エリア（情報 ＋ 勝率ゲージまですべてアイコンの内側に配置） */}
        <View className="flex-1 flex-col justify-center min-w-0">
          {/* 上段：3つのColumnブロック（自分情報・中央情報・相手情報） */}
          <View className="w-full flex-row items-center justify-between min-w-0">
            {/* 自分情報（名前 ＋ アゲハマ） */}
            <View className="flex-col items-start min-w-0 max-w-[30%]">
              <Text
                className="text-xs font-bold text-text w-full"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {username ?? "me"}
              </Text>
              <AgehamaDisplay
                count={self(currentAgehama.black, currentAgehama.white)}
              />
            </View>

            {/* 中央情報（結果 ＋ マッチタイプ・日付） */}
            <View className="flex-col items-center justify-center shrink px-1">
              <Text
                className="text-xs font-bold text-center leading-[15px]"
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

            {/* 相手情報（名前 ＋ アゲハマ） */}
            <View className="flex-col items-end min-w-0 max-w-[30%]">
              <View className="flex-row items-center justify-end w-full">
                <Text
                  className="text-xs font-bold text-text shrink"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {botNameFormatter(opponentUsername, t)}
                </Text>
                {isBot(opponentUsername) && (
                  <MaterialCommunityIcons
                    name={botFace}
                    size={12}
                    color={COLORS.textSub}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
              <AgehamaDisplay
                count={opp(currentAgehama.black, currentAgehama.white)}
              />
            </View>
          </View>

          {/* 下段：勝率ゲージ（アイコンの間に綺麗に収まる） */}
          {(hasAnalysis && showWinRateBar) && (
            <View className="w-full flex-row items-center mt-1.5">
              {/* 「100%」が入っても崩れないように幅を固定（32px） */}
              <Text
                className="text-[9px] font-bold w-[32px] text-right pr-0.5"
                style={{ color: COLORS.text }}
              >
                {leftPct}%
              </Text>
              <View className="flex-1 h-1.5 flex-row rounded-full overflow-hidden mx-1 bg-gray-200">
                <View
                  style={{
                    width: `${leftBarWidth}%`,
                    backgroundColor: isPlayerBlack
                      ? COLORS.darkObjectAccent
                      : COLORS.lightObject,
                  }}
                />
                <View
                  style={{
                    width: `${100 - leftBarWidth}%`,
                    backgroundColor: isPlayerBlack
                      ? COLORS.lightObject
                      : COLORS.darkObjectAccent,
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

        {/* 3. 右アイコン（相手） */}
        <AvatarWithPass
          rankIndex={opp(record.black_rank_index, record.white_rank_index) ?? 0}
          iconIndex={opp(record.black_icon_index, record.white_icon_index) ?? 0}
          size={48}
          color={!isPlayerBlack ? BLACK : WHITE}
          isLeft={false}
          showPass={!isPlayerBlack ? isBlackPass : isWhitePass}
        />
      </View>
    </View>
  );
});

RecordCardHeader.displayName = "RecordCardHeader";
