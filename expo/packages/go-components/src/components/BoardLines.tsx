import React, { memo } from "react";
import { ColorValue, StyleSheet, View } from "react-native";

type Props = {
  boardSize: number;
  innerWidth: number;
  cellSize: number;
  lineWidth: number;
  lineColor: ColorValue;
};

export const BoardLines = memo(function BoardLines({
  boardSize,
  innerWidth,
  cellSize,
  lineWidth,
  lineColor,
}: Props) {
  return (
    <>
      {Array.from({ length: boardSize }).map((_, i) => (
        <React.Fragment key={`line-${i}`}>
          <View
            style={[
              styles.line,
              {
                left: i * cellSize,
                height: innerWidth,
                width: lineWidth,
                backgroundColor: lineColor,
              },
            ]}
          />
          <View
            style={[
              styles.line,
              {
                top: i * cellSize,
                width: innerWidth,
                height: lineWidth,
                backgroundColor: lineColor,
              },
            ]}
          />
        </React.Fragment>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  line: {
    position: "absolute",
  },
});
