import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

// 囲碁のシーケンス
const boardSequence = [
  [
    ["●", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
  ],
  [
    ["●", "○", "."],
    [".", ".", "."],
    [".", ".", "."],
  ],
  [
    ["●", "○", "●"],
    [".", ".", "."],
    [".", ".", "."],
  ],
  [
    [".", "○", "●"],
    ["○", ".", "."],
    [".", ".", "."],
  ],
  [
    [".", "○", "●"],
    ["○", "●", "."],
    [".", ".", "."],
  ],
  [
    [".", "○", "."],
    ["○", "●", "○"],
    [".", ".", "."],
  ],
  [
    [".", "○", "."],
    ["○", "●", "○"],
    ["●", ".", "."],
  ],
  [
    [".", "○", "."],
    ["○", ".", "○"],
    [".", "○", "."],
  ],
  [
    [".", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
  ],
];

export const AnimatedGoBoard = () => {
  const [boardState, setBoardState] = useState<string[][]>([
    [".", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
  ]);

  useEffect(() => {
    let stepIndex = 0;

    const interval = setInterval(() => {
      setBoardState(boardSequence[stepIndex]);

      stepIndex++;

      if (stepIndex >= boardSequence.length) {
        stepIndex = 0;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const renderStone = (value: string) => {
    if (value === "●") return <View style={styles.blackStone} />;
    if (value === "○") return <View style={styles.whiteStone} />;
    return <View style={styles.emptyPoint} />;
  };

  return (
    <View style={styles.boardContainer}>
      {boardState.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.boardRow}>
          {row.map((cell, colIndex) => (
            <View key={`${rowIndex}-${colIndex}`} style={styles.boardCell}>
              {rowIndex < 2 && <View style={styles.verticalLine} />}
              {colIndex < 2 && <View style={styles.horizontalLine} />}
              {renderStone(cell)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    marginBottom: 64,
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  boardRow: {
    flexDirection: "row",
  },

  boardCell: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  verticalLine: {
    position: "absolute",
    width: 2.5,
    height: 56,
    backgroundColor: "#cbd5e0",
    top: 28,
  },

  horizontalLine: {
    position: "absolute",
    width: 56,
    height: 2.5,
    backgroundColor: "#cbd5e0",
    left: 28,
  },

  blackStone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#91a5b9",
  },

  whiteStone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 2.5,
    borderColor: "#cbd5e0",
  },

  emptyPoint: {
    width: 0,
    height: 0,
  },
});
