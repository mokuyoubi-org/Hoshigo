import React, { memo } from "react";
import { View } from "react-native";
import { COLORS } from "../constants/colors";

type TerritoryProps = {
  territoryValue?: number;
  stoneSize: number;
};

export const Territory = memo(function Territory({
  territoryValue,
  stoneSize,
}: TerritoryProps) {
  if (territoryValue === undefined) return null;

  return (
    <View
      style={{
        opacity: territoryValue === 0 ? 0 : 0.32,
        width: stoneSize / 2,
        height: stoneSize / 2,
        borderRadius: Math.max(2, stoneSize / 8),
        backgroundColor:
          territoryValue === 1
            ? COLORS.darkObject
            : territoryValue === 2
              ? COLORS.lightObject
              : "transparent",
      }}
    />
  );
});
