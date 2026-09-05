// IntersectionContainer.tsx
import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";

import { COLORS } from "../../constants/colors";
import { BLACK, Color, GoString, Grid } from "../../types/go";
import { Marker } from "./Marker";
import { PinPoint } from "./PinPoint";
import { PreviewStone } from "./PreviewStone";
import { Stone } from "./Stone";

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
  isBotMove?: boolean;
  enableDoubleTap: boolean;
  playerColor: Color;
  disabled: boolean;
  onPressGrid: (grid: Grid, goString: GoString | null) => void;
};

export const IntersectionContainer = memo(function DecoratedStone({
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
  isBotMove,
  enableDoubleTap,
  playerColor,
  disabled,
  onPressGrid,
}: Props) {
  const r = Math.floor(grid / boardSize);
  const c = grid % boardSize;
  const isDead = territoryValue === 3;
  const isDeadAndShow = isDead && showTerritory;

  const humanMoveColor = "#e2a1a17b"; // 🐱 人間の編集(赤)
  const botMoveColor = "#75b384d7"; // 🐱 ボットの着手(緑)

  // 最新手の背景色
  const currentMoveColor =
    isEdited || isBotMove
      ? undefined
      : goString?.color === BLACK
        ? COLORS.darkObjectAccent
        : COLORS.lightObjectAccent;

  // テリトリー（地）の色
  const territoryColor =
    territoryValue === 1
      ? COLORS.darkObject
      : territoryValue === 2
        ? COLORS.lightObject
        : undefined;

  const markOpacity = !isDeadAndShow ? 1 : 0.4;

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
      {/* ① 実線の石（シンプルに丸い石を描くだけにゃ！） */}
      {goString && (
        <Stone
          color={goString.color}
          stoneSize={stoneSize}
          opacity={isDeadAndShow ? 0.48 : 1}
        />
      )}

      {/* ①' 死んだ石の四角マーク（まとめ役が描画！） */}
      {goString && isDeadAndShow && (
        <Marker
          size={stoneSize / 2}
          color={
            goString.color === BLACK ? COLORS.lightObject : COLORS.darkObject
          }
          shape="square"
          opacity={0.32}
          zIndex={2}
        />
      )}

      {/* ② 最新手のマーカー */}
      {goString && isCurrentMove && (
        <Marker
          size={stoneSize * 0.6}
          color={currentMoveColor}
          shape="circle"
          opacity={!isDeadAndShow ? 1 : 0.32}
          zIndex={5}
        />
      )}

      {/* ③ 編集された石用マーク（人間＝赤） */}
      {isEdited && (
        <Marker
          size={stoneSize / 2}
          color={humanMoveColor}
          shape="square"
          opacity={markOpacity}
          zIndex={10}
        />
      )}

      {/* ③' ボットが打った石用マーク（ボット＝緑） */}
      {isBotMove && (
        <Marker
          size={stoneSize / 2}
          color={botMoveColor}
          shape="square"
          opacity={markOpacity}
          zIndex={10}
        />
      )}

      {/* ④ 仮置きの石 */}
      {!goString && isPending && enableDoubleTap && (
        <PreviewStone stoneSize={stoneSize} playerColor={playerColor} />
      )}

      {/* ⑤ 陣地（地）マーク */}
      {!goString && showTerritory && territoryValue !== 0 && (
        <Marker
          size={stoneSize / 2}
          color={territoryColor}
          shape="square"
          opacity={0.32}
          zIndex={1}
        />
      )}

      {/* ⑥ ピンポイント */}
      {isPinned && <PinPoint />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  gridPressable: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
