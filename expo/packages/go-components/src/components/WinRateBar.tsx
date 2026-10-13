// WinRateBar.tsx

import { memo } from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";

type Props = {
  leftPct: number;
  rightPct: number;
  leftBarColor: ColorValue;
  rightBarColor: ColorValue;
  leftNumberColor: ColorValue;
  rightNumberColor: ColorValue;
  fontFamily: string;
};

export const WinRateBar = memo(
  ({
    leftPct,
    rightPct,
    leftBarColor,
    rightBarColor,
    leftNumberColor,
    rightNumberColor,
    fontFamily,
  }: Props) => {
    const fontStyle = fontFamily ? { fontFamily } : null;
    return (
      <View style={styles.container}>
        {/* 左のバー */}
        <View
          style={{
            width: `${leftPct}%`,
            backgroundColor: leftBarColor,
          }}
        />
        {/* 右のバー */}
        <View
          style={{
            width: `${rightPct}%`,
            backgroundColor: rightBarColor,
          }}
        />
        {/* 数字のレイヤー（バーの上に重ねる） */}
        <View style={styles.overlay}>
          <Text style={[styles.text, { color: leftNumberColor }, fontStyle]}>
            {leftPct}%
          </Text>
          <Text style={[styles.text, { color: rightNumberColor }, fontStyle]}>
            {rightPct}%
          </Text>
        </View>
      </View>
    );
  },
);

WinRateBar.displayName = "WinRateBar";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    borderRadius: 9999,
    overflow: "hidden",
    height: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    pointerEvents: "none",
  },
  text: {
    fontSize: 14,
  },
});
