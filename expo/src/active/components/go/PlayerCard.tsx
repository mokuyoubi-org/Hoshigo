// PlayerCard.tsx
import { AgehamaDisplay } from "@/src/active/components/go/Agehama";
import { AvatarWithPass } from "@/src/active/components/go/AvatarWithPass";
import { useTranslation } from "@/src/active/language/i18n";
import { botNameFormatter } from "@/src/stable/logics/nameFormatter";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { secondsToMinutes } from "@/src/stable/logics/timeFormatter";
import { Color } from "expo-goband";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  username: string;
  iconIndex: number;
  points: number;
  color: Color;
  isLeft: boolean;
  showPass: boolean;
  agehamaCount: number;
  seconds: number;
  isMyTurn: boolean;
};

export function PlayerCard({
  username,
  iconIndex,
  points,
  color,
  isLeft,
  showPass,
  agehamaCount,
  seconds,
  isMyTurn,
}: Props) {
  const t = useTranslation();
  const rank = getRankInfo(points, t);

  return (
    <View
      className={`w-full items-center gap-2.5 rounded-2xl bg-foreground px-3 py-2 border-2 border-backgroundDark ${
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
        />
      </View>

      {/* 2. 名前とランク（中央の広いスペースを占有） */}
      <View
        className={`flex-1 flex-row items-center gap-1.5 min-w-0 ${
          isLeft ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <Text
          className="shrink text-base font-semibold text-text"
          numberOfLines={1}
        >
          {botNameFormatter(username, t)}
        </Text>

        <View className="shrink-0 px-2 py-0.5 bg-backgroundDark/50 rounded-full">
          <Text className="text-xs font-medium text-textSub">{rank.name}</Text>
        </View>
      </View>

      {/* 3. アゲハマと時間（端っこ） */}
      <View
        className={`flex-row items-center gap-2 shrink-0 ${
          isLeft ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <AgehamaDisplay count={agehamaCount} />
        <Text
          className={`min-w-[44px] text-base font-semibold text-text ${
            isMyTurn ? "opacity-100" : "opacity-50"
          } ${isLeft ? "text-right" : "text-left"}`}
        >
          {secondsToMinutes(seconds)}
        </Text>
      </View>
    </View>
  );
}
