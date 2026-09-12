// IntersectionContainer.tsx

import { BLACK, Color, GoString, Grid, MatchType, PASS_GRID } from "go-core";
import React, { memo } from "react";
import { ColorValue, Pressable, StyleSheet } from "react-native";
import { Marker } from "./Marker";
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
  isEdited?: boolean;
  isBotMove?: boolean;
  moveEvaluation?: "good" | "bad"; // 🐱 良手（○）・悪手（❌）の判定結果
  isCandidate?: boolean; // 🐱 候補手かどうか
  enableDoubleTap: boolean;
  playerColor: Color;
  disabled: boolean;
  onPressGrid: (grid: Grid, goString: GoString | null) => void;
  currentTurn: Color;
  lastMove: Grid;
  blackStoneColor: ColorValue;
  blackStoneAccentColor: ColorValue;
  whiteStoneColor: ColorValue;
  whiteStoneAccentColor: ColorValue;
  humanMoveColor: ColorValue;
  botMoveColor: ColorValue;
  goodMoveColor: ColorValue;
  badMoveColor: ColorValue;
  matchType: MatchType
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
  isEdited,
  isBotMove,
  moveEvaluation,
  isCandidate,
  enableDoubleTap,
  playerColor,
  disabled,
  onPressGrid,
  currentTurn,
  lastMove,
  blackStoneColor,
  blackStoneAccentColor,
  whiteStoneColor,
  whiteStoneAccentColor,
  humanMoveColor,
  botMoveColor,
  goodMoveColor,
  badMoveColor,
  matchType
}: Props) {
  const row = Math.floor(grid / boardSize);
  const col = grid % boardSize;
  const isDead = territoryValue === 3; // 1は黒の陣地、2は白の陣地、3は死に石

  return (
    <Pressable
      onPress={() => onPressGrid(grid, goString)}
      style={[
        styles.gridPressable,
        {
          left: col * cellSize - cellSize / 2 + 1,
          top: row * cellSize - cellSize / 2 + 1,
          width: cellSize,
          height: cellSize,
        },
      ]}
      disabled={disabled}
    >
      {/* 石 */}
      {goString && (
        <Stone
          color={goString.color}
          stoneSize={stoneSize}
          opacity={isDead && showTerritory ? 0.48 : 1}
          blackStoneColor={blackStoneColor}
          whiteStoneColor={whiteStoneColor}
        />
      )}

      {/* ダブルタップ用のプレビュー石 */}
      {!goString && isPending && enableDoubleTap && (
        <PreviewStone
          stoneSize={stoneSize}
          playerColor={playerColor}
          blackStoneColor={blackStoneColor}
          whiteStoneColor={whiteStoneColor}
        />
      )}

      {/* 最新手 */}
      {goString &&
        isCurrentMove &&
        !isEdited &&
        !isBotMove &&
        !(moveEvaluation && playerColor === goString.color) && ( // ⭕️❌がある時は表示しない
          <Marker
            size={stoneSize * 0.6}
            color={
              goString?.color === BLACK
                ? blackStoneAccentColor
                : whiteStoneAccentColor
            }
            shape="circle"
            opacity={!(isDead && showTerritory) ? 1 : 0.32}
            zIndex={5}
          />
        )}

      {/* 死んだ石 */}
      {goString && isDead && showTerritory && (
        <Marker
          size={stoneSize / 2}
          color={goString.color === BLACK ? whiteStoneColor : blackStoneColor}
          shape="square"
          opacity={0.32}
          zIndex={2}
        />
      )}

      {/* 陣地 */}
      {!goString && showTerritory && territoryValue !== 0 && (
        <Marker
          size={stoneSize / 2}
          color={territoryValue === 1 ? blackStoneColor : whiteStoneColor}
          shape="square"
          opacity={0.32}
          zIndex={1}
        />
      )}

      {/* 編集石（人間👦＝赤🟥） */}
      {isEdited && (
        <Marker
          size={stoneSize / 2}
          color={humanMoveColor}
          shape="square"
          opacity={!(isDead && showTerritory) ? 1 : 0.4}
          zIndex={10}
        />
      )}

      {/* ボットが打った石🤖=🟩 */}
      {isBotMove && (
        <Marker
          size={stoneSize / 2}
          color={botMoveColor}
          shape="square"
          opacity={!(isDead && showTerritory) ? 1 : 0.4}
          zIndex={10}
        />
      )}

      {/* 候補手
      (currentTurn !== playerColor)がめっちゃ大事！これがないと、白の手番になぜか黒の候補手が出てくる
      あと、パスの時に候補手出されるのも嫌なのでそれも防止する
      */}
      {!goString &&
        isCandidate &&
        (matchType <= 1 && currentTurn !== playerColor ||matchType >= 2 && currentTurn === playerColor  ) &&
        lastMove !== PASS_GRID && (
          <>
            {/* 薄い石 */}
            <Stone
              color={playerColor} // 自分の色固定ということ。つまり、自分の候補手しか表示しない
              stoneSize={stoneSize}
              opacity={0.6}
              blackStoneColor={blackStoneColor}
              whiteStoneColor={whiteStoneColor}
            />
            {/* 薄い良手（○）マーク */}
            <Marker
              size={stoneSize * 0.7}
              color={goodMoveColor}
              shape="good"
              opacity={0.6}
              zIndex={15}
            />
          </>
        )}

      {/* 実際に打たれた石に対する良手（○）・悪手（❌）の評価マーク */}
      {goString && moveEvaluation && playerColor === goString.color && (
        <Marker
          size={stoneSize * 0.7}
          shape={moveEvaluation}
          color={moveEvaluation === "good" ? goodMoveColor : badMoveColor}
          opacity={!(isDead && showTerritory) ? 1 : 0.4}
          zIndex={15}
        />
      )}
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
