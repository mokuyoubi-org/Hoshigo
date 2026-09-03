import { Color } from "@/packages/expo-goband/src";
import React from "react";
import { Text, View } from "react-native";
import { AgehamaDisplay } from "../../go/Agehama";
import { AvatarWithPass } from "../../go/AvatarWithPass";
import { botNameFormatter } from "@/src/stable/logics/nameFormatter";
import { useTranslation } from "@/src/active/language/i18n";

// ===== プレイヤーセル =====
type PlayerCellProps = {
  isLeft: boolean;
  username: string;
  iconIndex: number;
  rankIndex: number;
  color: Color;
  showPass: boolean;
  agehamaCount: number;
};

export const PlayerCell = React.memo(function PlayerCell({
  isLeft,
  username,
  iconIndex,
  rankIndex,
  color,
  showPass,
  agehamaCount,
}: PlayerCellProps) {
  const t = useTranslation()
  return (
    <View className={`flex-1 flex-col ${isLeft ? "items-start" : "items-end"}`}>
      <View
        className={`flex-row items-center gap-1.5 ${
          !isLeft ? "flex-row-reverse" : ""
        }`}
      >
        <AvatarWithPass
          rankIndex={rankIndex}
          iconIndex={iconIndex}
          size={48}
          color={color}
          isLeft={isLeft}
          showPass={showPass}
        />
        <View
          className={`flex-col gap-1 flex-1 ${
            isLeft ? "items-start" : "items-end"
          }`}
        >
          <Text
            className={`text-sm font-medium text-text ${
              isLeft ? "text-left" : "text-right flex-shrink"
            }`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {botNameFormatter(username, t)}
          </Text>
          <AgehamaDisplay count={agehamaCount} />
        </View>
      </View>
    </View>
  );
});
PlayerCell.displayName = "PlayerCell";
