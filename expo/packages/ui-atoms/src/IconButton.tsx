// IconButton.tsx

import { cloneElement, ReactElement } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

type Props = TouchableOpacityProps & {
  icon: ReactElement<{ size?: number; color?: string }>;
  iconColor: string;
  borderColor?: string;
  backgroundColor: string;
  size?: number; // ← ボタン全体のサイズ（指定がなかったら今まで通りの54にする）
};

export const IconButton = ({
  icon,
  iconColor,
  borderColor = "transparent",
  backgroundColor,
  size = 54, // ← デフォルトは54
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  // ボタンのサイズからアイコンのサイズを自動計算
  const computedIconSize = Math.round(size * 0.52);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2, // ← きれいな丸にするために半分にする
          backgroundColor,
          borderColor,
        },
        style,
      ]}
      activeOpacity={activeOpacity}
      {...props}
    >
      {cloneElement(icon, {
        size: computedIconSize, // ← 自動計算されたアイコンサイズをセットする
        color: iconColor,
      })}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
