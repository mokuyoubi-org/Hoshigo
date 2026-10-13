/**
 * TextButton.tsx
 * テキストボタン。色は呼び出し側（親）から渡す。
 */

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

type Props = TouchableOpacityProps & {
  text: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  fontFamily: string; // 文字のフォント(省略時はシステムのフォント)
};

export const TextButton = ({
  text,
  textColor,
  backgroundColor,
  borderColor,
  fontFamily,
  disabled,
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  const fontStyle = fontFamily ? { fontFamily } : null;

  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.button,
        backgroundColor ? { backgroundColor } : null,
        borderColor ? { borderColor } : null,
        style,
      ]}
      activeOpacity={activeOpacity}
      {...props}
    >
      <Text
        style={[
          styles.text,
          { color: !disabled ? textColor : borderColor },
          fontStyle,
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54, // h-12
    paddingHorizontal: 14,
    borderRadius: 54, // rounded-full
    borderWidth: 2, // border-2
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16, // text-sm
  },
});
