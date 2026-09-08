import { FontAwesome } from "@expo/vector-icons";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
type Props = {
  size: number;
  color?: string;
  shape?: "square" | "circle" | "good" | "bad";
  opacity?: number;
  zIndex?: number;
};

// 🐱 編集マーク・最新手・テリトリー・死に石・良手・悪手をこれ1つで表示する
export const Marker = memo(function Marker({
  size,
  color,
  shape = "square",
  opacity = 1,
  zIndex = 10,
}: Props) {
  const oColor = "#3bce428f"; // デフォルトは緑色
  const xColor = "#ff7474a2"; // デフォルトは赤色

  // ① 良手（○）の描画
  if (shape === "good") {
    const strokeWidth = Math.max(2, size * 0.24); // サイズに合わせて線の太さを調整

    return (
      <View
        style={[
          styles.base,
          styles.center,
          {
            width: size,
            height: size,
            opacity,
            zIndex,
          },
        ]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: oColor,
          }}
        />
      </View>
    );
  }

  // ② 悪手（❌）の描画
  if (shape === "bad") {
    return (
      <View
        style={[
          styles.base,
          styles.center,
          {
            width: size,
            height: size,
            opacity,
            zIndex,
          },
        ]}
      >
        <FontAwesome
          name="close"
          size={size}
          color={xColor}
          style={{
            textAlign: "center",
          }}
        />
      </View>
    );
  }

  // ③ 既存の square / circle（色がないときは描画しない）
  if (!color) return null;

  return (
    <View
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
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
});
