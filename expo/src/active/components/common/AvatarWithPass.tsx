// AvatarWithPass.tsx

import { useTranslation } from "@/src/active/i18n/LangProvider";
import { Pass } from "go-components";
import { Color } from "go-core";
import React from "react";
import { View } from "react-native";
import { useAppFont } from "../../hooks/useAppFont";
import { useColors } from "../../hooks/useTheme";
import { Avatar } from "./Avatar";

type Props = {
  rankIndex: number;
  iconIndex: number;
  size: number;
  color?: Color;
  isLeft: boolean;
  showPass?: boolean;
  agehama?: number;
};

export const AvatarWithPass = ({
  rankIndex,
  iconIndex,
  size,
  color,
  isLeft,
  showPass = false,
  agehama,
}: Props) => {
  const fontFamily = useAppFont();
  const t = useTranslation();
  const colors = useColors();

  return (
    // relative をつけることで、中の absolute な Pass の基準にする
    <View className="relative justify-center items-center">
      {/* Pass を absolute にして、アバターの上に浮かせる */}
      <View className={`absolute -top-5 z-10 ${isLeft ? "left-0" : "right-0"}`}>
        <Pass
          visible={showPass}
          isLeft={isLeft}
          textColor={colors.text}
          backgroundColor={colors.foreground}
          borderColor={colors.backgroundDark}
          passText={t("common.pass")}
          fontFamily={fontFamily}
        />
      </View>

      <Avatar
        rankIndex={rankIndex}
        iconIndex={iconIndex}
        size={size}
        playerColor={color}
        agehama={agehama}
      />
    </View>
  );
};