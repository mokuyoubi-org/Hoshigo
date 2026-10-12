// BotHandicapTable.tsx

import { HANDICAP_DATA, HandicapType } from "@/src/constants/ranks";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { TFunction, TranslationKey } from "@/src/i18n/types";
import { nameFormatter } from "@/src/logics/bot/botNameLogics";
import { boardSizeOptions } from "@/src/logics/format/boardSizeToText";
import { BoardSize } from "go-core/src";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { SegmentedControl } from "ui-atoms";
import { MyText } from "../common/MyText";

// 辞書キーを参照してテキストを取得する表示用コンポーネント
const HandicapCell = ({
  type,
  t,
  colors,
}: {
  type: HandicapType;
  t: TFunction;
  colors: ReturnType<typeof useColors>;
}) => {
  if (type === null) {
    return (
      <MyText
        className="flex-1 text-center text-xs"
        style={{ color: colors.textSub }}
      >
        -
      </MyText>
    );
  }

  return (
    <MyText
      className="flex-1 text-center text-xs"
      style={{ color: colors.text }}
    >
      {t(`MatchType.matchType_${type}` as TranslationKey)}
    </MyText>
  );
};

export const BotHandicapTable = () => {
  const fontFamily = useAppFont();
  const t = useTranslation();
  const colors = useColors();
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const rows = HANDICAP_DATA[boardSize];

  return (
    <View className="w-full my-2">
      {/* 盤面サイズ切替タブ */}
      <View className="mb-2">
        <SegmentedControl
          trackBackgroundColor={colors.backgroundStrong}
          activeSegmentBackgroundColor={colors.foreground}
          activeTextColor={colors.text}
          inactiveTextColor={colors.textSub}
          value={boardSize}
          options={boardSizeOptions(t)}
          onSelect={setBoardSize}
          fontFamily={fontFamily}
          height={40}
        />
      </View>

      {/* ハンデ表 */}
      <View
        className="rounded-xl overflow-hidden border"
        style={{
          borderColor: colors.backgroundStrong,
          backgroundColor: colors.foreground,
        }}
      >
        {/* ヘッダー */}
        <View
          className="flex-row p-2 items-center border-b"
          style={{
            backgroundColor: colors.backgroundStrong,
            borderColor: colors.backgroundStrong,
          }}
        >
          <MyText
            className="w-14 text-center text-xs"
            style={{ color: colors.textSub }}
          >
            {t("common.rank")}
          </MyText>
          <MyText
            // botなのでMixedTextである必要はない
            className="flex-1 text-center text-xs"
            style={{ color: colors.text }}
          >
            {nameFormatter("bot1", t)}
          </MyText>
          <MyText
            // botなのでMixedTextである必要はない
            className="flex-1 text-center text-xs"
            style={{ color: colors.text }}
          >
            {nameFormatter("bot2", t)}
          </MyText>
          <MyText
            // botなのでMixedTextである必要はない
            className="flex-1 text-center text-xs"
            style={{ color: colors.text }}
          >
            {nameFormatter("bot3", t)}
          </MyText>
        </View>

        {/* データ行 */}
        <ScrollView nestedScrollEnabled={true}>
          {rows.map((row, index) => {
            const isOdd = index % 2 === 1;
            return (
              <View
                key={row.rankKey}
                className="flex-row py-2.5 px-2 items-center border-b"
                style={{
                  backgroundColor: isOdd
                    ? colors.background
                    : colors.foreground,
                  borderColor: colors.backgroundStrong,
                }}
              >
                {/* 段級位 */}
                <MyText
                  className="w-14 text-center text-xs"
                  style={{ color: colors.textSub }}
                >
                  {t(`Rank.${row.rankKey}` as TranslationKey)}
                </MyText>

                {/* 各Botのハンデ */}
                <HandicapCell type={row.bot1} t={t} colors={colors} />
                <HandicapCell type={row.bot2} t={t} colors={colors} />
                <HandicapCell type={row.bot3} t={t} colors={colors} />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};
