import React from "react";
import { Text, View } from "react-native";
import { COLORS } from "../../constants/colors";

type WinRateBarProps = {
  blackWinRate: number | null; // 0-100、黒視点。null = まだ解析されていない
  blackName: string;
  whiteName: string;
};

export function WinRateBar({
  blackWinRate,
  blackName,
  whiteName,
}: WinRateBarProps) {
  const hasValue = blackWinRate != null;
  const blackPct = hasValue ? blackWinRate : 50;
  const whitePct = 100 - blackPct;

  return (
    <View className="w-full">
      <View className="flex-row items-center justify-between mb-1.5 px-1">
        <View className="flex-row items-center gap-1.5">
          <View
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: COLORS.darkObject }}
          />
          <Text className="text-xs text-text">{blackName}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-text">{whiteName}</Text>
          <View
            className="w-3 h-3 rounded-full border"
            style={{
              backgroundColor: COLORS.lightObject,
              borderColor: COLORS.lightObjectAccent,
            }}
          />
        </View>
      </View>

      <View
        className="h-7 rounded-full overflow-hidden flex-row"
        style={{ backgroundColor: COLORS.backgroundDark }}
      >
        <View
          style={{ width: `${blackPct}%`, backgroundColor: COLORS.darkObject }}
          className="items-start justify-center pl-2.5"
        >
          {hasValue && (
            <Text
              className="text-xs font-bold"
              style={{ color: COLORS.lightObject }}
            >
              {blackPct}%
            </Text>
          )}
        </View>
        <View
          style={{ width: `${whitePct}%`, backgroundColor: COLORS.lightObject }}
          className="items-end justify-center pr-2.5"
        >
          {hasValue && (
            <Text
              className="text-xs font-bold"
              style={{ color: COLORS.darkObject }}
            >
              {whitePct}%
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
