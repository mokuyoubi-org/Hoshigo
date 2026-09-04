// PlayerCell.tsx

import { Color } from "@/packages/expo-goband/src";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
import { botNameFormatter, isBot } from "@/src/stable/logics/botNameLogics";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // アイコンのインポートを追加
import React from "react";
import { Text, View } from "react-native";
import { AgehamaDisplay } from "../../go/Agehama";
import { AvatarWithPass } from "../../go/AvatarWithPass";

// ===== プレイヤーセル =====
type PlayerCellProps = {
  isLeft: boolean;
  username: string;
  iconIndex: number;
  rankIndex: number;
  color: Color;
  showPass: boolean;
  agehamaCount: number;
  playerWin?: boolean;
};

export const PlayerCell = React.memo(function PlayerCell({
  isLeft,
  username,
  iconIndex,
  rankIndex,
  color,
  showPass,
  agehamaCount,
  playerWin,
}: PlayerCellProps) {
  const t = useTranslation();
  let botFace: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  if (playerWin === true) {
    botFace = "robot-dead";
  } else if (playerWin === false) {
    botFace = "robot-excited";
  } else {
    botFace = "robot";
  }

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
          {/* 名前とボットマークを表示するコンテナ */}
          <View className={`flex-row items-center min-w-0`}>
            <Text
              className="text-sm font-medium text-text shrink"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {botNameFormatter(username, t)}
            </Text>
            {isBot(username) && (
              <MaterialCommunityIcons
                name={botFace}
                size={14}
                color={COLORS.textSub}
                style={{
                  marginLeft: 4,
                  marginRight: 0,
                }}
              />
            )}
          </View>
          <AgehamaDisplay count={agehamaCount} />
        </View>
      </View>
    </View>
  );
});
PlayerCell.displayName = "PlayerCell";
