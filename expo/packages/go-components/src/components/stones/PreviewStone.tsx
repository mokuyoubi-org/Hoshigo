// PreviewStone.tsx

import React, { memo } from "react";
import { ColorValue, StyleSheet, View } from "react-native";
import { BLACK, Color } from "go-core";

type Props = {
  stoneSize: number;
  playerColor: Color;
  blackStoneColor: ColorValue;
  whiteStoneColor: ColorValue;
};

// 🐱 React.memo で囲って無駄な再描画を防ぐ
export const PreviewStone = memo(function PreviewStone({
  stoneSize,
  playerColor,
  blackStoneColor,
  whiteStoneColor,
}: Props) {
  // ボーダーの色を決定する
  const borderColor = playerColor === BLACK ? blackStoneColor : whiteStoneColor;

  // 石の大きさに合わせて太めのボーダー（15%くらい）を計算する
  const borderWidth = Math.max(3, stoneSize * 0.15);

  return (
    <View style={styles.centerContainer}>
      <View
        style={[
          styles.stoneBase,
          {
            width: stoneSize,
            height: stoneSize,
            borderRadius: stoneSize / 2,
            borderColor: borderColor,
            borderWidth: borderWidth,
            backgroundColor: "transparent",
            opacity: 0.8,
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
  stoneBase: {},
});
