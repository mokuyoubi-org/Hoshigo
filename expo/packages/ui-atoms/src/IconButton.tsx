/**
 * IconButton.tsx
 * アイコンボタン。サイズは統一されている。色は呼び出し側が指定する。
 */

import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

type Props = TouchableOpacityProps & {
  icon: React.ReactElement<{ size?: number; color?: string }>;
  color: string;
  inverted?: boolean; // 色を反転するかどうかのオプション
};

export const IconButton = ({
  icon,
  color,
  inverted = false, // デフォルトは反転しない（false）
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  // invertedがtrueなら背景にcolorを使い、アイコンは白にする
  const backgroundColor = inverted ? color : "#ffffff";
  const borderColor = inverted ? color : "#e1e8ed";
  const iconColor = inverted ? "#ffffff" : color;

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
      {React.cloneElement(icon, {
        size: 20,
        color: iconColor,
      })}
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
  },
});