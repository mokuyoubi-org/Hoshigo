// Stone.tsx
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BLACK, Color } from "../../types/go";

type StoneProps = {
  color: Color;
  stoneSize: number;
  opacity?: number;
};

// 🐱 余計なものは一切持たず、丸い石を描画するだけのピュアな部品だにゃ！
export const Stone = memo(function Stone({
  color,
  stoneSize,
  opacity = 1,
}: StoneProps) {
  const isBlack = color === BLACK;

  return (
    <View style={styles.centerContainer}>
      <View
        style={[
          styles.stoneBase,
          {
            width: stoneSize,
            height: stoneSize,
            borderRadius: stoneSize / 2,
            backgroundColor: isBlack ? COLORS.darkObject : COLORS.lightObject,
            opacity: opacity,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  stoneBase: {
    borderWidth: 0,
  },
});