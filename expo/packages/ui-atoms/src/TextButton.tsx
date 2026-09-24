/**
 * TextButton.tsx
 * テキストボタン。色は呼び出し側（親）から渡す。
 */

import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

type Props = TouchableOpacityProps & {
  text: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
};

export const TextButton = ({
  text,
  color,
  backgroundColor,
  borderColor,
  disabled,
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.button,
        backgroundColor ? { backgroundColor } : null,
        borderColor ? { borderColor } : null,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={activeOpacity}
       {...props}     
    >
      <Text style={[styles.text, { color }]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48, // h-[42px]
    paddingHorizontal: 14, // px-3.5
    borderRadius: 9999, // rounded-full
    borderWidth: 2, // border-2
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.4, // opacity-40
  },
  text: {
    fontSize: 14, // text-sm
    fontWeight: "bold", // font-bold
  },
});
