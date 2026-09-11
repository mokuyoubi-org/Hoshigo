import React from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  stoneSize?: number; // 将来的に使う場合のために残す
  backgroundColor: ColorValue; // 背景色（呼び出し側から指定）
  textColor: ColorValue; // 文字色（呼び出し側から指定）
};

export function Agehama({ count, backgroundColor, textColor }: Props) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        count === 0 && styles.disabled,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>+{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.25,
  },
  text: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
