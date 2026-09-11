import { FontAwesome } from "@expo/vector-icons";
import React, { memo } from "react";
import { ColorValue, StyleSheet, View } from "react-native";

type Props = {
  size: number;
  color: ColorValue;
  shape?: "square" | "circle" | "good" | "bad";
  opacity?: number;
  zIndex?: number;
};

// 編集マーク・最新手・テリトリー・死に石・良悪手をこれ1つで表示する
export const Marker = memo(function Marker({
  size,
  color,
  shape = "square",
  opacity = 1,
  zIndex = 10,
}: Props) {
  if (!color) return null;

  // 中身のコンポーネントを切り替えるヘルパー
  const renderContent = () => {
    switch (shape) {
      case "good": {
        const strokeWidth = Math.max(2, size * 0.24);
        return (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
            }}
          />
        );
      }
      case "bad":
        return (
          <FontAwesome
            name="close"
            size={size}
            color={color}
            style={styles.textCenter}
          />
        );
      default:
        // square / circle の背景スタイル
        return (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius:
                  shape === "circle" ? size / 2 : Math.max(2, size / 4),
                backgroundColor: color,
              },
            ]}
          />
        );
    }
  };

  return (
    <View
      style={[
        styles.base,
        styles.center,
        { width: size, height: size, opacity, zIndex },
      ]}
    >
      {renderContent()}
    </View>
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
  textCenter: {
    textAlign: "center",
  },
});
