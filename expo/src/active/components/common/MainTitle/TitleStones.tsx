import { useColors } from "@/src/active/hooks/useTheme";
import React from "react";
import { View } from "react-native";

// ⚪️⚫️ 背景の重なる黒石と白石
export const TitleStones = () => {
  const colors = useColors();
  return (
    <View className="absolute -bottom-2 flex-row items-center justify-center w-full h-full">
      <View
        className="w-36 h-36 rounded-full absolute -translate-x-9 -translate-y-3"
        style={{
          backgroundColor: colors.primaryDark,
          boxShadow: `0px 6px ${colors.backgroundDark}`,
        }}
      />
      <View
        className="w-36 h-36 rounded-full absolute translate-x-9 translate-y-3"
        style={{
          backgroundColor: colors.whiteStone,
          boxShadow: `0px 6px ${colors.backgroundDark}`,
        }}
      />
    </View>
  );
};
