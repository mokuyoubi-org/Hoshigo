// PlayerCard.tsx

import { AvatarWithPass } from "@/src/components/avatar/AvatarWithPass";
import { MixedText } from "@/src/components/common/MixedText";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { isBot, nameFormatter } from "@/src/logics/format/nameFormatter";
import { secondsToMinutes } from "@/src/logics/format/timeFormatter";
import { getRankInfo } from "@/src/logics/rank/rankLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // アイコンのインポートを追加
import { Color } from "go-core";
import { View } from "react-native";

type Props = {
  username: string;
  iconIndex: number;
  rating: number;
  color: Color;
  isLeft: boolean;
  showPass: boolean;
  agehamaCount: number;
  seconds?: number; // 🐱 時計を使わない対局(練習戦)ではundefinedのまま渡す
  isMyTurn?: boolean;
};

export const PlayerCard = ({
  username,
  iconIndex,
  rating: rating,
  color,
  isLeft,
  showPass,
  agehamaCount,
  seconds,
  isMyTurn = true,
}: Props) => {
  const colors = useColors();
  const t = useTranslation();
  const rank = getRankInfo(rating, t);

  return (
    <View
      className={`w-full items-center gap-2 rounded-2xl bg-foreground px-3 py-2 border-2 border-backgroundStrong ${
        isLeft ? "flex-row" : "flex-row-reverse"
      }`}
    >
      {/* 1. アバター */}
      <View className="items-center justify-center shrink-0">
        <AvatarWithPass
          rankIndex={rank.index}
          iconIndex={iconIndex}
          size={44}
          color={color}
          isLeft={isLeft}
          showPass={showPass}
          agehama={agehamaCount}
        />
      </View>

      {/* 2. 名前とランク（中央の広いスペースを占有） */}
      <View
        className={`flex-1 flex-row items-center gap-2 min-w-0 ${
          isLeft ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {/* 名前とボットマークを表示するコンテナ */}
        <View className={"flex-row items-center min-w-0 flex-row"}>
          <MixedText className="text-xl text-text" numberOfLines={1}>
            {nameFormatter(username, t)}
          </MixedText>
          {isBot(username) && (
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

        <View className="shrink-0 px-2 py-0.5 bg-backgroundStrong rounded-full">
          <MyText className="text-sm text-textSub">{rank.name}</MyText>
        </View>
      </View>

      {/* 3. アゲハマと時間（端っこ）。時間はseconds未指定なら非表示 */}
      <View
        className={`flex-row items-center gap-2 shrink-0 ${
          isLeft ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {seconds !== undefined && (
          <MyText
            className={`min-w-12 text-lg ${
              isMyTurn ? "text-text" : "text-textSub"
            } ${isLeft ? "text-right" : "text-left"}`}
          >
            {secondsToMinutes(seconds)}
          </MyText>
        )}
      </View>
    </View>
  );
};
