import React, { memo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { BLACK, Color, GoString, Grid } from "../types/go";
import { PreviewStone } from "./PreviewStone";
import { Stone } from "./Stone";
import { Territory } from "./Territory";

const HAND_ICON = require("../../assets/icons/hand.png");

type BoardGridCellProps = {
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
  isEdited?: boolean; // 🐱 編集された石フラグを追加！
  enableDoubleTap: boolean;
  playerColor: Color;
  disabled: boolean;
  onPressGrid: (grid: Grid, goString: GoString | null) => void;
};

// 🐱 React.memo で「プロップスが変わっていないマス目」の再描画をスキップする
export const BoardGridCell = memo(function BoardGridCell({
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
}: BoardGridCellProps) {
  const r = Math.floor(grid / boardSize);
  const c = grid % boardSize;
  const isDead = territoryValue === 3;

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
          goString={goString}
          stoneSize={stoneSize}
          isCurrentMove={isCurrentMove}
          isDead={isDead}
          showTerritory={showTerritory}
        />
      )}

      {/* 🐱 編集された石用のハイライト（うっすら緑色 ＋ 緑色の枠線） */}
      {isEdited && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: stoneSize,
            height: stoneSize,
            borderRadius: stoneSize / 2,
            borderWidth: 5,
            borderColor: goString?.color===BLACK?"#6b985e":"#6b985e", // 緑枠線
            zIndex: 10,
          }}
        />
      )}

      {/* ② 仮置きの石 */}
      {!goString && isPending && enableDoubleTap && (
        <PreviewStone stoneSize={stoneSize} playerColor={playerColor} />
      )}

      {/* ③ 陣地（地） */}
      {!goString && !isPending && showTerritory && (
        <Territory territoryValue={territoryValue} stoneSize={stoneSize} />
      )}

      {/* ④ ピンポイント */}
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