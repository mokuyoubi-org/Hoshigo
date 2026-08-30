import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { BLACK, GoString } from "../types/go";
import { COLORS } from "../constants/colors";

type StoneProps = {
  goString: GoString;
  stoneSize: number;
  isCurrentMove: boolean;
  isDead: boolean;
  showTerritory: boolean;
};

export const Stone = memo(function Stone({
  goString,
  stoneSize,
  isCurrentMove,
  isDead,
  showTerritory,
}: StoneProps) {
  const { color } = goString;

  const getStoneStyle = () => {
    if (isDead && showTerritory) {
      return color === BLACK
        ? { backgroundColor: COLORS.darkObject, opacity: 0.48 }
        : { backgroundColor: COLORS.lightObject, opacity: 0.48 };
    }
    if (isCurrentMove) {
      return color === BLACK
        ? {
            backgroundColor: COLORS.darkObjectAccent,
            borderWidth: stoneSize * 0.2,
            borderColor: COLORS.darkObject,
          }
        : {
            backgroundColor: COLORS.lightObjectAccent,
            borderWidth: stoneSize * 0.2,
            borderColor: COLORS.lightObject,
          };
    }
    return color === BLACK
      ? { backgroundColor: COLORS.darkObject }
      : { backgroundColor: COLORS.lightObject };
  };

  return (
    <View style={styles.centerContainer}>
      <View
        style={[
          styles.stoneBase,
          getStoneStyle(),
          {
            width: stoneSize,
            height: stoneSize,
            borderRadius: stoneSize / 2,
          },
        ]}
      />
      {isDead && showTerritory && (
        <View
          style={[
            styles.deadStoneSquare,
            {
              width: stoneSize / 2,
              height: stoneSize / 2,
              borderRadius: Math.max(2, stoneSize / 8),
              backgroundColor:
                color === BLACK ? COLORS.lightObject : COLORS.darkObject,
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
    opacity: 1,
  },
  deadStoneSquare: {
    position: "absolute",
    opacity: 0.32,
  },
});