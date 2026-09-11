// AvatarWithPass.tsx

import { Pass } from "@/packages/go-components/src";
import { Color } from "@/packages/go-core/src";
import React from "react";
import { View } from "react-native";
import { COLORS } from "../../constants/colors";
import { useTranslation } from "../../i18n";
import { Avatar } from "./Avatar";

type Props = {
  rankIndex: number;
  iconIndex: number;
  size: number;
  color?: Color;
  isLeft: boolean;
  showPass?: boolean;
};

export const AvatarWithPass = ({
  rankIndex,
  iconIndex,
  size,
  color,
  isLeft,
  showPass = false,
}: Props) => {
  const t = useTranslation();
  return (
    // relative をつけることで、中の absolute な Pass の基準にする
    <View className="relative justify-center items-center">
      {/* Pass を absolute にして、アバターの上に浮かせる */}
      <View className={`absolute -top-5 z-10 ${isLeft ? "left-0" : "right-0"}`}>
        <Pass
          visible={showPass}
          isLeft={isLeft}
          textColor={COLORS.text}
          backgroundColor={COLORS.foreground}
          borderColor={COLORS.backgroundDark}
          passText={t("common.pass")}
        />
      </View>

      <Avatar
        rankIndex={rankIndex}
        iconIndex={iconIndex}
        size={size}
        playerColor={color}
      />
    </View>
  );
};
