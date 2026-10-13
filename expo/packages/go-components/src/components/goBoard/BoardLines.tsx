// BoardLines.tsx

import { memo } from "react";
import { ColorValue, StyleSheet, View } from "react-native";

type Props = {
  boardSize: number;
  innerWidth: number;
  cellSize: number;
  lineWidth: number;
  lineColor: ColorValue;
};

export const BoardLines = memo(
  ({ boardSize, innerWidth, cellSize, lineWidth, lineColor }: Props) => (
    <View>
      {Array.from({ length: boardSize }).flatMap((_, i) => [
        <View
          key={`v-line-${i}`}
          style={[
            styles.line,
            {
              left: i * cellSize,
              height: innerWidth,
              width: lineWidth,
              backgroundColor: lineColor,
            },
          ]}
        />,
        <View
          key={`h-line-${i}`}
          style={[
            styles.line,
            {
              top: i * cellSize,
              width: innerWidth,
              height: lineWidth,
              backgroundColor: lineColor,
            },
          ]}
        />,
      ])}
    </View>
  ),
);

const styles = StyleSheet.create({
  line: {
    position: "absolute",
  },
});
