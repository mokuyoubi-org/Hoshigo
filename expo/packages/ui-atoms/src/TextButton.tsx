/**
 * ToggleTextButton.tsx
 * 丸型のテキストトグルボタン。
 * オフのときは斜め線が入る。
 */

import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";
import Svg, { Line } from "react-native-svg";

type Props = TouchableOpacityProps & {
  title: string;
  color: string;
  isOn: boolean; // オンかオフかの状態
};

export const ToggleTextButton = ({
  title,
  color,
  isOn,
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  // オンなら背景にcolorを使い、オフなら白背景＆色枠線にする
  const backgroundColor = isOn ? color : "#ffffff";
  const borderColor = color;
  const textColor = isOn ? "#ffffff" : color;
  const strokeColor = isOn ? "#ffffff" : color;

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
      {/* ボタンの文字 */}
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>

      {/* オフのときだけ斜め線（バツ線）を重ねて表示する */}
      {!isOn && (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" width="100%" viewBox="0 0 42 42">
            <Line
              x1="8"
              y1="34"
              x2="34"
              y2="8"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  text: {
    fontSize: 12,
    fontWeight: "bold",
  },
});