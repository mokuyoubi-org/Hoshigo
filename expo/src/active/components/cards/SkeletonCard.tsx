// SkeletonCard.tsx

import { ICONS } from "@/src/active/constants/icons";
import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";

export const SkeletonCard = ({ height }: { height: number }) => {
  return (
    <View
      className="items-center justify-center bg-foreground rounded-[20px] border-2 border-backgroundDark overflow-hidden"
      style={{ height }}
    >
      {/* overlayは絶対配置のまま背景として敷く */}
      <View className="absolute inset-0 bg-foreground" />

      {/* Flexフローに乗せるだけで中央に来る */}
      <Image
        source={ICONS[0]}
        className="rounded-[12px] opacity-50 z-10"
        style={{ width: 72, height: 72 }}
        contentFit="contain"
      />
    </View>
  );
};
