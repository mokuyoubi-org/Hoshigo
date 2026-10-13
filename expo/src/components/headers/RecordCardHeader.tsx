import { MixedText } from "@/src/components/common/MixedText";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useLang, useTranslation } from "@/src/i18n/LangProvider";
import { isBot } from "@/src/logics/bot/botLogics";
import { nameFormatter } from "@/src/logics/bot/botNameLogics";
import {
  matchTypeToText,
  resultToCommentSimple,
  resultToObjectiveComment,
} from "@/src/logics/format/textFormatter";
import { RecordType } from "@/src/types/record";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Color, MatchType } from "go-core";
import { memo, useMemo } from "react";
import { View } from "react-native";
import { AvatarWithPass } from "../avatar/AvatarWithPass";

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
};

export const RecordCardHeader = memo(
  ({
    record,
    leftPlayer,
    rightPlayer,
    playerWin,
    simpleComment = true,
    matchType,
  }: Props) => {
    const colors = useColors();
    const { lang } = useLang();
    const t = useTranslation();

    const resultText = useMemo(
      () =>
        simpleComment
          ? (resultToCommentSimple(record.result ?? "", t) ??
            t("common.unknown"))
          : (resultToObjectiveComment(record.result ?? "", t) ??
            t("common.unknown")),
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
        ? colors.success
        : playerWin === false
          ? colors.failure
          : colors.text;

    const leftUsername = leftPlayer.username ?? "";
    const rightUsername = rightPlayer.username ?? "";

    return (
      <View className="w-full p-2">
        <View className="w-full flex-row items-center justify-between gap-2">
          {/* 1. 左アイコン */}
          <AvatarWithPass
            rankIndex={leftPlayer.rankIndex ?? 0}
            iconIndex={leftPlayer.iconIndex ?? 0}
            size={48}
            color={leftPlayer.color}
            isLeft={true}
            showPass={leftPlayer.showPass}
            // ここでアゲハマを出す必要はない
          />

          {/* 2. 中央エリア */}
          <View className="flex-1 flex-col justify-center min-w-0">
            <View className="w-full flex-col gap-1 min-w-0">
              {/* 1列目: username - result - username */}
              <View className="w-full flex-row items-center justify-between min-w-0">
                {/* 左ユーザー名 */}
                <View className="flex-row items-center">
                  <MixedText
                    className="text-base text-text shrink"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isBot(leftUsername)
                      ? nameFormatter(leftUsername, t)
                      : (leftPlayer.username ?? "user")}
                  </MixedText>
                  {isBot(leftUsername) && (
                    <MaterialCommunityIcons
                      name={"robot"}
                      size={12}
                      color={colors.textSub}
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </View>

                {/* 右ユーザー名 */}
                <View className="flex-row items-center justify-end">
                  <MixedText
                    className="text-base text-text shrink"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isBot(rightUsername)
                      ? nameFormatter(rightUsername, t)
                      : (rightPlayer.username ?? "user")}
                  </MixedText>
                  {isBot(rightUsername) && (
                    <MaterialCommunityIcons
                      name={"robot"}
                      size={12}
                      color={colors.textSub}
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </View>
              </View>

              {/* 2列目 */}
              <View className="w-full flex-row items-center justify-center gap-2">
                <MyText
                  className={`${simpleComment ? "text-sm" : "text-base"} text-center`}
                  style={{
                    color: simpleComment ? accentColor : colors.textSub,
                  }}
                  numberOfLines={1}
                >
                  {resultText}
                </MyText>
                <MyText
                  className="text-xs text-center"
                  style={{ color: colors.textSub }}
                  numberOfLines={1}
                >
                  {dateText !== "" && `${dateText} • `}
                  {matchTypeToText(matchType, t)}
                </MyText>
              </View>
            </View>
          </View>

          {/* 3. 右アイコン */}
          <AvatarWithPass
            rankIndex={rightPlayer.rankIndex ?? 0}
            iconIndex={rightPlayer.iconIndex ?? 0}
            size={48}
            color={rightPlayer.color}
            isLeft={false}
            showPass={rightPlayer.showPass}
            // ここでアゲハマを出す必要はない
          />
        </View>
      </View>
    );
  },
);

RecordCardHeader.displayName = "RecordCardHeader";
