// AvatarWithPass.tsx

import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { Pass } from "go-components";
import { Color } from "go-core";
import React from "react";
import { View } from "react-native";
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
          borderColor={colors.backgroundStrong}
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
