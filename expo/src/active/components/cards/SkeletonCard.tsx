// SkeletonCard.tsx

import { ICONS } from "@/src/active/constants/icons";
import React from "react";
import { View } from "react-native";
import { AppImage } from "../AppImage";

export const SkeletonCard = ({ height }: { height: number }) => {
  return (
    <View
      className="items-center justify-center bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden"
      style={{ height }}
    >
      {/* overlayは絶対配置のまま背景として敷く */}
      <View className="absolute inset-0 bg-foreground" />

      {/* Flexフローに乗せるだけで中央に来る */}
      <AppImage
        source={ICONS[0]}
        className="rounded-xl z-10" // このopacityは許可
        style={{ width: 72, height: 72 }}
        contentFit="contain"
      />
    </View>
  );
};
