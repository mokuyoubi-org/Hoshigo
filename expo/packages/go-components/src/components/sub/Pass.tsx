import React from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";

type Props = {
  visible?: boolean;
  isLeft: boolean;
  backgroundColor: ColorValue; // 吹き出しの背景色
  borderColor: ColorValue; // 枠線・しっぽの枠線の色
  textColor: ColorValue; // 文字色
  passText: string;
};

const TAIL_SIZE = 5;

export function Pass({
  visible = true,
  isLeft,
  backgroundColor,
  borderColor,
  textColor,
  passText,
}: Props) {
  return (
    <View style={[styles.container, !visible && styles.hidden]}>
      {/* 吹き出し本体 */}
      <View style={[styles.bubble, { backgroundColor, borderColor }]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.text, { color: textColor }]}
        >
          {passText}
        </Text>
      </View>

      {/* しっぽの枠線 */}
      <View
        style={[
          styles.tailBorder,
          { borderTopColor: borderColor },
          isLeft ? styles.tailLeft : styles.tailRight,
        ]}
      />

      {/* しっぽの塗りつぶし */}
      <View
        style={[
          styles.tailFill,
          { borderTopColor: backgroundColor },
          isLeft ? styles.tailFillLeft : styles.tailFillRight,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
  },
  hidden: {
    opacity: 0,
  },
  bubble: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  // しっぽの共通スタイル（枠線）
  tailBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopWidth: TAIL_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  // しっぽの共通スタイル（塗りつぶし）
  tailFill: {
    position: "absolute",
    bottom: 1,
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopWidth: TAIL_SIZE * 2,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  // 左右の位置調整
  tailLeft: {
    marginLeft: 10,
  },
  tailRight: {
    alignSelf: "flex-end",
    marginRight: 10,
  },
  tailFillLeft: {
    left: 10,
  },
  tailFillRight: {
    right: 10,
  },
});
