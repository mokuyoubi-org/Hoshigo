import { COLORS } from "@/src/active/constants/colors";
import { ICONS } from "@/src/active/constants/icons";
import { Agehama } from "@/src/active/types/matchTypes";
import {
  BLACK,
  Board,
  BoardSize,
  GoString,
  Grid,
  PASS_GRID,
} from "@/src/stable/types/goTypes";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

type Props = {
  // 盤面関連
  board: Board;
  onPutStone: (grid: Grid, boardSize: BoardSize) => void;
  moveHistory?: Grid[];
  territoryBoard?: number[][];
  disabled?: boolean;
  boardWidth: number;
  boardSize: BoardSize;

  // ゲーム状態
  isGameEnded: boolean;

  // リプレイ関連
  boardHistory: Board[];
  currentIndex: number;

  // オプション
  boardBackgroundColor?: string;
  lineColor?: string;
  stoneShadow?: boolean;
  agehamaHistory: Agehama[];
  pinPoints?: Grid[];
};

export function GoBoard({
  boardSize,
  board,
  onPutStone,
  moveHistory = [],
  territoryBoard,
  disabled = false,
  isGameEnded,
  boardHistory,
  currentIndex,
  stoneShadow,
  boardWidth,
  pinPoints,
}: Props) {
  const cellSize = boardWidth / (boardSize - 1);
  const stoneSize = cellSize * 0.9;
  const lineWidth = Math.max(1, boardWidth / 200);
  const paddingSize = (boardWidth / boardSize) * 0.8;
  const radiusSize = boardWidth * 0.06;

  // 直近の手（着手マーク用）を取得する（パスまたは0手目は null）
  const currentMove = (): Grid | null => {
    if (currentIndex === 0 || moveHistory.length === 0) return null;
    const move = moveHistory[currentIndex - 1];
    return move === PASS_GRID ? null : move;
  };

  // 陣地を表示するかどうか（リプレイの最後のみ）
  const showTerritory = isGameEnded && currentIndex === boardHistory.length - 1;

  // 石の見た目・スタイルを決定
  const getStoneStyle = (
    goString: GoString,
    grid: Grid,
    territoryValue?: number,
  ) => {
    if (!goString) return null;

    // 数値同士の判定（grid === currentMove()）で一発比較！
    const isCurrentMove = grid === currentMove();
    const isDead = territoryValue === 3;
    const { color } = goString;

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
    <View style={styles.container}>
      {/* 碁盤のうち、本体部分 */}
      <View
        style={[
          styles.boardContainer,
          {
            backgroundColor: COLORS.primary,
            padding: paddingSize,
            borderRadius: radiusSize,
          },
        ]}
      >
        <View
          style={[
            styles.boardWrapper,
            { width: boardWidth, height: boardWidth },
          ]}
        >
          {/* 盤線 */}
          {Array.from({ length: boardSize }).map((_, i) => (
            <React.Fragment key={`line-${i}`}>
              <View
                style={[
                  styles.verticalLine,
                  {
                    left: i * cellSize,
                    backgroundColor: COLORS.background,
                    height: boardWidth,
                    width: lineWidth,
                  },
                ]}
              />
              <View
                style={[
                  styles.horizontalLine,
                  {
                    top: i * cellSize,
                    backgroundColor: COLORS.background,
                    width: boardWidth,
                    height: lineWidth,
                  },
                ]}
              />
            </React.Fragment>
          ))}

          {/* 碁石・着手可能エリア */}
          {board.map((goString, grid) => {
            // インデックス数値から行(r)と列(c)を算術計算（0-based）
            const r = Math.floor(grid / boardSize);
            const c = grid % boardSize;

            const territoryValue = territoryBoard?.[r]?.[c];

            return (
              <Pressable
                key={grid}
                onPress={() => !disabled && onPutStone(grid, boardSize)}
                style={[
                  styles.intersection,
                  {
                    left: c * cellSize - cellSize / 2 + 1,
                    top: r * cellSize - cellSize / 2 + 1,
                    width: cellSize,
                    height: cellSize,
                  },
                ]}
                disabled={disabled}
              >
                {/* 石 */}
                {goString && (
                  <View
                    style={{ justifyContent: "center", alignItems: "center" }}
                  >
                    <View
                      style={[
                        styles.stone,
                        getStoneStyle(goString, grid, territoryValue),
                        !stoneShadow && styles.noShadow,
                        {
                          width: stoneSize,
                          height: stoneSize,
                          borderRadius: stoneSize / 2,
                        },
                      ]}
                    />
                    {/* 半透明の死に石の上にも小さな四角を置く */}
                    {territoryValue === 3 && showTerritory && (
                      <View
                        style={[
                          styles.emptyGrid,
                          {
                            width: stoneSize / 2,
                            height: stoneSize / 2,
                            borderRadius: Math.max(2, stoneSize / 8),
                            backgroundColor:
                              goString.color === BLACK
                                ? COLORS.lightObject
                                : COLORS.darkObject,
                          },
                          styles.territoryOnStone,
                        ]}
                      />
                    )}
                  </View>
                )}
                {/* 空点 */}
                {!goString && showTerritory && territoryBoard && (
                  <View
                    style={[
                      styles.emptyGrid,
                      {
                        width: stoneSize / 2,
                        height: stoneSize / 2,
                        borderRadius: Math.max(2, stoneSize / 8),
                        backgroundColor:
                          territoryValue === 1
                            ? COLORS.darkObject
                            : territoryValue === 2
                              ? COLORS.lightObject
                              : "transparent",
                      },
                      territoryValue === 0 && styles.transparent,
                    ]}
                  />
                )}
                {/* ピンポイント */}
                {pinPoints !== undefined && pinPoints.includes(grid) && (
                  <Image
                    source={ICONS[200]}
                    style={[
                      styles.iconImage,
                      {
                        zIndex: 10,
                      },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  iconImage: {
    position: "absolute",
    width: 80,
    height: 80,
    top: -40,
    left: -10,
    zIndex: 10, // ← 石より上にする
  }, // ── トップバー ──
  // ── 碁盤 ──
  boardContainer: {
    borderRadius: 16,
    position: "relative",
  },

  boardWrapper: {
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
  },
  horizontalLine: {
    position: "absolute",
  },
  intersection: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  stone: {
    borderWidth: 0,
    opacity: 1,
  },
  noShadow: {
    shadowOpacity: 0,
  },
  emptyGrid: {
    opacity: 0.32,
  },
  transparent: {
    opacity: 0,
  },
  territoryOnStone: {
    position: "absolute",
  },
});
