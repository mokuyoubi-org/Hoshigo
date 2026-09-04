import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { BLACK, Color } from "../..";
import { COLORS } from "../../constants/colors";


type StoneProps = {
  color: Color;
  stoneSize: number;
  isDead?: boolean;
  showTerritory?: boolean;
};

export const Stone = memo(function Stone({
  color,
  stoneSize,
  isDead,
  showTerritory,
}: StoneProps) {
  const isBlack = color === BLACK;
  const isDeadAndShow = isDead && showTerritory;

  return (
    <View style={styles.centerContainer}>
      <View
        style={[
          styles.stoneBase,
          {
            width: stoneSize,
            height: stoneSize,
            borderRadius: stoneSize / 2,
            backgroundColor: isBlack ? COLORS.darkObject : COLORS.lightObject,
            opacity: isDeadAndShow ? 0.48 : 1,
          },
        ]}
      />
      {isDeadAndShow && (
        <View
          style={[
            styles.deadStoneSquare,
            {
              width: stoneSize / 2,
              height: stoneSize / 2,
              borderRadius: Math.max(2, stoneSize / 8),
              backgroundColor: isBlack ? COLORS.lightObject : COLORS.darkObject,
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  stoneBase: {
    borderWidth: 0,
  },
  deadStoneSquare: {
    position: "absolute",
    opacity: 0.32,
  },
});
