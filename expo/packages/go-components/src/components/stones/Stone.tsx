// Stone.tsx
import { BLACK, Color } from "go-core";
import React, { memo } from "react";
import { ColorValue, StyleSheet, View } from "react-native";

type StoneProps = {
  color: Color;
  stoneSize: number;
  opacity?: number;
  blackStoneColor: ColorValue;
  whiteStoneColor: ColorValue;
};

// 🐱 余計なものは一切持たず、丸い石を描画するだけのピュアな部品
export const Stone = memo(function Stone({
  color,
  stoneSize,
  opacity = 1,
  blackStoneColor,
  whiteStoneColor,
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
            backgroundColor: isBlack ? blackStoneColor : whiteStoneColor,
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
