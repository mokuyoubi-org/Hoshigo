// AvatarWithPass.tsx
import { Color } from "expo-goband";
import { Avatar } from "@/src/active/components/go/Avatar";
import { Pass } from "@/src/active/components/go/Pass";
import React from "react";
import { View } from "react-native";

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
  return (
    // relative をつけることで、中の absolute な Pass の基準にする
    <View className="relative justify-center items-center">
      {/* Pass を absolute にして、アバターの上に浮かせる */}
      <View className={`absolute -top-5 z-10 ${isLeft ? "left-0" : "right-0"}`}>
        <Pass visible={showPass} isLeft={isLeft} />
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
