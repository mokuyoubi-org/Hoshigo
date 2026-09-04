import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../constants/colors";

type Props = {
  boardSize: number;
  innerWidth: number;
  cellSize: number;
  lineWidth: number;
};

// 🐱 盤線は一回描いたら使い回す
export const BoardLines = memo(function BoardLines({
  boardSize,
  innerWidth,
  cellSize,
  lineWidth,
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
    backgroundColor: COLORS.background,
  },
});
