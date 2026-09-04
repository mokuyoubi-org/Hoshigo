import React, { memo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { PreviewStone } from "./PreviewStone";
import { Stone } from "./Stone";
import { Territory } from "./Territory";
import { BLACK, Color, GoString, Grid } from "../..";
import { COLORS } from "../../constants/colors";

const HAND_ICON = require("../../../assets/icons/hand.png");

type Props = {
  grid: Grid;
  boardSize: number;
  cellSize: number;
  stoneSize: number;
  goString: GoString | null;
  territoryValue?: number;
  isPending: boolean;
  isCurrentMove: boolean;
  showTerritory: boolean;
  isPinned: boolean;
  isEdited?: boolean;
  enableDoubleTap: boolean;
  playerColor: Color;
  disabled: boolean;
  onPressGrid: (grid: Grid, goString: GoString | null) => void;
};

export const DecoratedStone = memo(function DecoratedStone({
  grid,
  boardSize,
  cellSize,
  stoneSize,
  goString,
  territoryValue,
  isPending,
  isCurrentMove,
  showTerritory,
  isPinned,
  isEdited,
  enableDoubleTap,
  playerColor,
  disabled,
  onPressGrid,
}: Props) {
  const r = Math.floor(grid / boardSize);
  const c = grid % boardSize;
  const isDead = territoryValue === 3;

  const glowColor = "#e2a1a17b";

  return (
    <Pressable
      onPress={() => onPressGrid(grid, goString)}
      style={[
        styles.gridPressable,
        {
          left: c * cellSize - cellSize / 2 + 1,
          top: r * cellSize - cellSize / 2 + 1,
          width: cellSize,
          height: cellSize,
        },
      ]}
      disabled={disabled}
    >
      {/* ① 実線の石 */}
      {goString && (
        <Stone
          color={goString.color}
          stoneSize={stoneSize}
          isDead={isDead}
          showTerritory={showTerritory}
        />
      )}

      {/* ② 最新手（isCurrentMove）のマーカー表示 */}
      {goString && isCurrentMove && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: stoneSize,
            height: stoneSize,
            borderRadius: stoneSize / 2,
            backgroundColor:
            isEdited?undefined:
              goString.color === BLACK
                ? COLORS.darkObjectAccent
                : COLORS.lightObjectAccent,
            borderWidth: stoneSize * 0.2,
            borderColor:
              goString.color === BLACK ? COLORS.darkObject : COLORS.lightObject,
          }}
        />
      )}

      {/* ③ 編集された石用の四角形マーカー（Territoryと同じサイズ・形） */}
      {isEdited && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: stoneSize / 2,
            height: stoneSize / 2,
            borderRadius: Math.max(2, stoneSize / 8),
            backgroundColor: glowColor,
            zIndex: 10,
          }}
        />
      )}

      {/* ④ 仮置きの石 */}
      {!goString && isPending && enableDoubleTap && (
        <PreviewStone stoneSize={stoneSize} playerColor={playerColor} />
      )}

      {/* ⑤ 陣地（地） */}
      {!goString && !isPending && showTerritory && (
        <Territory territoryValue={territoryValue} stoneSize={stoneSize} />
      )}

      {/* ⑥ ピンポイント */}
      {isPinned && <Image source={HAND_ICON} style={styles.pinIcon} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  gridPressable: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  pinIcon: {
    position: "absolute",
    width: 80,
    height: 80,
    top: -40,
    left: -10,
    zIndex: 10,
  },
});