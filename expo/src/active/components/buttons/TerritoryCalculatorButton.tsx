/**
 * TerritoryCalculatorButton.tsx
 * 地計算ボタンと計算結果を一つにまとめたコンポーネント
 */

import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";
import { COLORS } from "../../constants/colors";

type Props = TouchableOpacityProps & {
  isCalculating: boolean;
  resultText?: string | null;
  color: string;
};

export const TerritoryCalculatorButton = ({
  isCalculating,
  resultText,
  color,
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  // 結果があるときは背景を塗りつぶして目立たせる
  const hasResult = !!resultText;
  const backgroundColor = hasResult ? color : "#ffffff";
  const borderColor = COLORS.backgroundDark;
  const textColor = hasResult ? "#ffffff" : color;
  const iconColor = hasResult ? "#ffffff" : COLORS.primary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
      activeOpacity={activeOpacity}
      {...props}
    >
      {isCalculating ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <FontAwesome5 name="calculator" size={20} color={iconColor} />
      )}

      {/* 結果テキストがあるときだけ横に表示する */}
      {hasResult && !isCalculating && (
        <Text style={[styles.text, { color: textColor }]}>{resultText}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 42,
    minWidth: 42,
    borderRadius: 21,
    borderWidth: 2,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
