import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { getFlagUrl } from "@/src/stable/logics/country";

type Props = {
  countryCode: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  /** falseにすると膜なしの生の国旗になるにゃ。基本つけっぱでOK */
  withOverlay?: boolean;
};

export function FlagImage({
  countryCode,
  width = 24,
  height = 16,
  borderRadius = 2,
  withOverlay = true,
}: Props) {
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
      <Image
        source={{ uri: getFlagUrl(countryCode) }}
        style={{ width: "100%", height: "100%" }}
      />
      {withOverlay && (
        <View
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: COLORS.primary + "40",
          }}
        />
      )}
    </View>
  );
}