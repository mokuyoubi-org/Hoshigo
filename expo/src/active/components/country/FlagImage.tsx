import { getFlagUrl } from "@/src/stable/logics/country";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useColors } from "../../hooks/useTheme";
import { AppImage } from "../AppImage";

type Props = {
  countryCode: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  /** falseにすると膜なしの生の国旗になる。基本つけっぱでOK */
  withOverlay?: boolean;
};

export function FlagImage({
  countryCode,
  width = 24,
  height = 16,
  borderRadius = 2,
  withOverlay = true,
}: Props) {
  const colors = useColors();
  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <AppImage
        source={{ uri: getFlagUrl(countryCode) }}
        style={{ width: "100%", height: "100%" }}
      />
      {withOverlay && (
        <View
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: colors.primary,
          }}
        />
      )}
    </View>
  );
}
