// IconButton.tsx

import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

type Props = TouchableOpacityProps & {
  icon: React.ReactElement<{ size?: number; color?: string }>;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
};

export const IconButton = ({
  icon,
  iconColor,
  borderColor,
  backgroundColor,
  activeOpacity = 0.7,
  style,
  ...props
}: Props) => {
  // invertedがtrueなら背景にcolorを使い、アイコンは白にする

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
        size: 28,
        color: iconColor,
      })}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 54,
    height: 54,
    borderRadius: 54,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
