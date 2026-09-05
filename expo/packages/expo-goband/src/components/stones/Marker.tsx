// Marker.tsx
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  size: number;
  color?: string;
  shape?: "square" | "circle";
  opacity?: number;
  zIndex?: number;
};

// 🐱 編集マーク・最新手・テリトリー・死に石マークを全部これ1つで表示するにゃ！
export const Marker = memo(function Marker({
  size,
  color,
  shape = "square",
  opacity = 1,
  zIndex = 10,
}: Props) {
  if (!color) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: shape === "circle" ? size / 2 : Math.max(2, size / 4),
          backgroundColor: color,
          opacity,
          zIndex,
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    position: "absolute",
  },
});