// Divider.tsx

import React from "react";
import { ColorValue, StyleSheet, View, ViewProps } from "react-native";

// ViewPropsを継承しつつ、backgroundColorを必ず渡す形にする
interface DividerProps extends ViewProps {
  backgroundColor: ColorValue;
}

export const Divider = ({ backgroundColor, style, ...props }: DividerProps) => {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor }, // 受け取った色をここにセット
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: "100%",
  },
});
