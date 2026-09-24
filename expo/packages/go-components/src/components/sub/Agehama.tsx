import React from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  stoneSize?: number; // 将来的に使う場合のために残す
  backgroundColor: ColorValue; // 背景色（呼び出し側から指定）
  disabledColor: ColorValue; // 背景色（呼び出し側から指定）
  textColor: ColorValue; // 文字色（呼び出し側から指定）
};

export function Agehama({
  count,
  backgroundColor,
  disabledColor,
  textColor,
}: Props) {
  // countが0より大きい（1以上）なら通常の背景色、0ならDisabledの背景色を使う
  const isEnabled = count > 0;
  const currentBackgroundColor = isEnabled ? backgroundColor : disabledColor;

  return (
    <View
      style={[styles.container, { backgroundColor: currentBackgroundColor }]}
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
  text: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
