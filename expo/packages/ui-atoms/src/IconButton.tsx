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
};

export const IconButton = ({
  icon,
  color,
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      activeOpacity={activeOpacity}
      {...props}
    >
      {React.cloneElement(icon, {
        size: 20,
        color,
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
    borderColor: "#e1e8ed", // backgroundDark
    backgroundColor: "#ffffff", // foreground
    justifyContent: "center",
    alignItems: "center",
  },
});
