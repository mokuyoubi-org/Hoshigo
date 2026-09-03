// RecordCardHeader.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useLang, useTranslation } from "@/src/active/language/i18n";
import { RecordType } from "@/src/active/types/record";
import {
  matchTypeToText,
  resultToComment,
  resultToCommentSimple,
} from "@/src/stable/logics/textFormatter";
import { Agehama, BLACK, MatchType, WHITE } from "expo-goband";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { PlayerCell } from "./PlayerCell";
import { botNameFormatter } from "@/src/stable/logics/nameFormatter";

type HeaderProps = {
  record: RecordType;
  isPlayerBlack?: boolean;
  playerWin?: boolean;
  isBlackPass: boolean;
  isWhitePass: boolean;
  currentAgehama: Agehama;
  simpleComment?: boolean;
  matchType: MatchType;
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
}: HeaderProps) {
  const { lang } = useLang();
  const t = useTranslation();

  const self = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? blackVal : whiteVal;
  const opp = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? whiteVal : blackVal;

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
            year: "numeric",
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

  return (
    <View className="w-full flex-row items-end px-2 pt-2.5 pb-2">
      <PlayerCell
        isLeft
        username={botNameFormatter(self(record.black_username, record.white_username), t)}
        iconIndex={self(record.black_icon_index, record.white_icon_index) ?? 0}
        rankIndex={self(record.black_rank_index, record.white_rank_index) ?? 0}
        color={isPlayerBlack ? BLACK : WHITE}
        showPass={isPlayerBlack ? isBlackPass : isWhitePass}
        agehamaCount={self(currentAgehama.black, currentAgehama.white)}
      />

      <View className="pt-3 flex-1 flex-col items-center justify-evenly">
        <Text
          className="text-[10px] text-center leading-[14px]"
          style={{ color: COLORS.textSub }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {dateText}
        </Text>
        <Text
          className="text-[11px] font-bold text-center leading-[15px]"
          style={{ color: simpleComment ? accentColor : COLORS.textSub }}
          numberOfLines={simpleComment ? 1 : 2}
          ellipsizeMode="tail"
        >
          {resultText}
        </Text>
        <Text
          className="text-[10px] font-semibold text-center leading-[15px]"
          style={{ color: COLORS.textSub }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {matchTypeToText(matchType, t)}
        </Text>
      </View>

      <PlayerCell
        isLeft={false}
        username={botNameFormatter(opp(record.black_username, record.white_username), t)}
        iconIndex={opp(record.black_icon_index, record.white_icon_index) ?? 0}
        rankIndex={opp(record.black_rank_index, record.white_rank_index) ?? 0}
        color={!isPlayerBlack ? BLACK : WHITE}
        showPass={!isPlayerBlack ? isBlackPass : isWhitePass}
        agehamaCount={opp(currentAgehama.black, currentAgehama.white)}
      />
    </View>
  );
});
RecordCardHeader.displayName = "RecordCardHeader";
