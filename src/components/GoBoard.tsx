import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Board, GoString, Grid } from "../lib/goLogics";
import { Agehama } from "../lib/goUtils";

// アゲハマを表示するヘルパーコンポーネント
const AgehamaDisplay: React.FC<{ count: number; isBlack: boolean }> = ({
  count,
  isBlack,
}) => {
  const { colors } = useTheme();

  // 0の場合は何も表示しない
  if (count === 0) {
    return <View style={styles.agehamaContainer} />;
  }

  const stoneStyle = isBlack
    ? {
        backgroundColor: colors.whiteStone,
        borderWidth: 1.5,
        borderColor: colors.subtext,
      }
    : {
        backgroundColor: colors.blackStone,
        borderWidth: 1.5,
        borderColor: colors.subtext,
      };

  // 5つ以上の場合はテキスト形式で表示
  if (count >= 5) {
    return (
      <View style={styles.agehamaContainer}>
        <View style={[styles.agehamaTextStone, stoneStyle]} />
        <Text
          style={[
            styles.agehamaText,
            { color: colors.blackStone },
            isBlack && { color: colors.whiteStone },
          ]}
        >
          ×{count}
        </Text>
      </View>
    );
  }

  // 5つ未満の場合は石を並べて表示
  return (
    <View style={styles.agehamaContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`stone-${index}`}
          style={[styles.agehamaTextStone, stoneStyle]}
        />
      ))}
    </View>
  );
};




interface GoBoardProps {
  topBar? : boolean;
  boardSize?: number;
  currentIndex: number;
  board: Board;
  onPutStone: (grid: Grid) => void;
  moveHistory?: string[];
  territoryBoard?: number[][];
  showTerritory?: boolean;
  disabled?: boolean;
  stoneShadow?: boolean;
  agehamaHistory: Agehama[];
  boardPixelSize?: number; // 🆕 親から碁盤のサイズを受け取る
}

export const GoBoard: React.FC<GoBoardProps> = ({
  topBar=true,
  boardSize = 9,
  currentIndex,
  board,
  onPutStone,
  moveHistory = [],
  territoryBoard,
  showTerritory = false,
  disabled = false,
  stoneShadow = true,
  agehamaHistory,
  boardPixelSize = 300, // 🆕 デフォルトは300
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  // 🆕 onLayoutやuseStateは不要！
  const BOARD_PIXEL_SIZE = boardPixelSize;
  const CELL_SIZE = BOARD_PIXEL_SIZE / (boardSize - 1);
  const STONE_PIXEL_SIZE = CELL_SIZE * 0.9;
  const LINE_WIDTH = Math.max(1, BOARD_PIXEL_SIZE / 200);
  const STAR_POINT_SIZE = Math.max(4, CELL_SIZE / 3);

  // 🆕 現在の手の座標を計算（何度も計算しないように）
  const currentMoveCoords =
    moveHistory.length > 0 && moveHistory[currentIndex - 1] !== "p"
      ? {
          row: Number(moveHistory[currentIndex - 1]?.[0]),
          col: Number(moveHistory[currentIndex - 1]?.[2]),
        }
      : null;

  const getStoneStyle = (
    goString: GoString,
    row: number,
    col: number,
    territoryValue?: number,
  ) => {
    if (!goString) return null;

    // 🆕 現在の手かどうかの判定を最適化
    const isCurrentMove =
      currentMoveCoords?.row === row && currentMoveCoords?.col === col;
    const isDead = territoryValue === 3;
    const { color } = goString;

    if (isDead && showTerritory) {
      return color === "black"
        ? { backgroundColor: colors.blackStone, opacity: 0.48 }
        : { backgroundColor: colors.whiteStone, opacity: 0.48 };
    }
    if (isCurrentMove) {
      return color === "black"
        ? {
            backgroundColor: colors.blackStoneCurrent,
            borderWidth: STONE_PIXEL_SIZE * 0.2,
            borderColor: colors.blackStone,
          }
        : {
            backgroundColor: colors.whiteStoneCurrent,
            borderWidth: STONE_PIXEL_SIZE * 0.2,
            borderColor: colors.whiteStone,
          };
    }
    return color === "black"
      ? { backgroundColor: colors.blackStone }
      : { backgroundColor: colors.whiteStone };
  };

  // 🆕 パスの判定を最適化
  const lastMove = moveHistory[currentIndex - 1];
  const isPass = lastMove === "p";
  const isBlackPass = isPass && currentIndex % 2 === 1;
  const isWhitePass = isPass && currentIndex % 2 === 0;

  return (
    <View style={styles.container}>
      {/* 横並びレイアウト: 黒アゲハマ - パス - 白アゲハマ */}
      {topBar&&<View style={styles.topInfoContainer}>
        {/* 黒のアゲハマ */}
        <View style={styles.agehamaSection}>
          <AgehamaDisplay
            count={agehamaHistory[currentIndex].black}
            isBlack={true}
          />
        </View>

        {/* パス表示 */}
        <View style={styles.passIndicatorContainer}>
          {isBlackPass && (
            <View
              style={[styles.passBadge, { backgroundColor: colors.blackStone }]}
            >
              <Text style={[styles.passText, { color: colors.whiteStone }]}>
                {t("GoBoard.blackPass")}
              </Text>
            </View>
          )}
          {isWhitePass && (
            <View
              style={[
                styles.passBadge,
                {
                  backgroundColor: colors.whiteStone,
                  borderWidth: 1,
                  borderColor: colors.gridLine,
                },
              ]}
            >
              <Text style={[styles.passText, { color: colors.blackStone }]}>
                {t("GoBoard.whitePass")}
              </Text>
            </View>
          )}
        </View>

        {/* 白のアゲハマ */}
        <View style={styles.agehamaSection}>
          <AgehamaDisplay
            count={agehamaHistory[currentIndex].white}
            isBlack={false}
          />
        </View>
      </View>}

      {/*碁盤部分*/}
      <View
        style={[
          styles.boardContainer,
          {
            backgroundColor: colors.gridBackground,
            borderColor: colors.borderColor,
          },
        ]}
        // onLayout={handleLayout}
      >
        <View
          style={[
            styles.boardWrapper,
            { width: BOARD_PIXEL_SIZE, height: BOARD_PIXEL_SIZE },
          ]}
        >
          {/* 碁盤の線を描画 */}
          {Array.from({ length: boardSize }).map((_, i) => (
            <React.Fragment key={`line-${i}`}>
              <View
                style={[
                  styles.verticalLine,
                  {
                    left: i * CELL_SIZE,
                    backgroundColor: colors.gridLine,
                    height: BOARD_PIXEL_SIZE,
                    width: LINE_WIDTH,
                  },
                ]}
              />
              <View
                style={[
                  styles.horizontalLine,
                  {
                    top: i * CELL_SIZE,
                    backgroundColor: colors.gridLine,
                    width: BOARD_PIXEL_SIZE,
                    height: LINE_WIDTH,
                  },
                ]}
              />
            </React.Fragment>
          ))}

          {/* 星(ほし)を描画 */}
          {boardSize === 9 && (
            <>
              <StarPoint
                row={3}
                col={3}
                colors={colors}
                CELL_SIZE={CELL_SIZE}
                starSize={STAR_POINT_SIZE}
              />
              <StarPoint
                row={3}
                col={7}
                colors={colors}
                CELL_SIZE={CELL_SIZE}
                starSize={STAR_POINT_SIZE}
              />
              <StarPoint
                row={7}
                col={3}
                colors={colors}
                CELL_SIZE={CELL_SIZE}
                starSize={STAR_POINT_SIZE}
              />
              <StarPoint
                row={7}
                col={7}
                colors={colors}
                CELL_SIZE={CELL_SIZE}
                starSize={STAR_POINT_SIZE}
              />
              <StarPoint
                row={5}
                col={5}
                colors={colors}
                CELL_SIZE={CELL_SIZE}
                starSize={STAR_POINT_SIZE}
              />
            </>
          )}

          {/* 碁石と着手可能エリア */}
          {Object.entries(board).map(([key, goString]) => {
            const [row, col] = key.split(",").map(Number);
            const territoryValue = territoryBoard?.[row - 1]?.[col - 1];

            return (
              <Pressable
                key={key}
                onPress={() => !disabled && onPutStone({ row, col })}
                style={[
                  styles.intersection,
                  {
                    left: (col - 1) * CELL_SIZE - CELL_SIZE / 2 + 1,
                    top: (row - 1) * CELL_SIZE - CELL_SIZE / 2 + 1,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  },
                ]}
                disabled={disabled}
              >
                {goString && (
                  <>
                    <View
                      style={[
                        styles.stone,
                        getStoneStyle(goString, row, col, territoryValue),
                        !stoneShadow && styles.noShadow,
                        {
                          width: STONE_PIXEL_SIZE,
                          height: STONE_PIXEL_SIZE,
                          borderRadius: STONE_PIXEL_SIZE / 2,
                        },
                      ]}
                    />
                    {/* deadStonesの上にも陣地表示を重ねる */}
                    {territoryValue === 3 && showTerritory && (
                      <View
                        style={[
                          styles.emptyGrid,
                          {
                            width: STONE_PIXEL_SIZE / 2,
                            height: STONE_PIXEL_SIZE / 2,
                            borderRadius: Math.max(2, STONE_PIXEL_SIZE / 8),
                            backgroundColor:
                              goString.color === "black"
                                ? colors.whiteStone
                                : colors.blackStone,
                          },
                          styles.territoryOnStone,
                        ]}
                      />
                    )}
                  </>
                )}

                {!goString && showTerritory && territoryBoard && (
                  <View
                    style={[
                      styles.emptyGrid,
                      {
                        width: STONE_PIXEL_SIZE / 2,
                        height: STONE_PIXEL_SIZE / 2,
                        borderRadius: Math.max(2, STONE_PIXEL_SIZE / 8),
                        backgroundColor:
                          territoryValue === 1
                            ? colors.blackStone
                            : territoryValue === 2
                              ? colors.whiteStone
                              : "transparent",
                      },
                      territoryValue === 0 && styles.transparent,
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
};

// 星を描画するコンポーネント
const StarPoint: React.FC<{
  row: number;
  col: number;
  colors: any;
  CELL_SIZE: number;
  starSize: number;
}> = ({ row, col, colors, CELL_SIZE, starSize }) => {
  return (
    <View
      style={[
        styles.starPoint,
        {
          left: (col - 1) * CELL_SIZE,
          top: (row - 1) * CELL_SIZE,
          backgroundColor: colors.gridLine,
          width: starSize,
          height: starSize,
          borderRadius: starSize / 2,
          transform: [
            { translateX: -starSize / 2 },
            { translateY: -starSize / 2 },
          ],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  topInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  agehamaSection: {
    flex: 1,
  },
  passIndicatorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  passBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  passText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  agehamaContainer: {
    width: 100,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  agehamaTextStone: {
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  agehamaText: {
    fontSize: 16,
    fontWeight: "600",
  },
  boardContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
  starPoint: {
    position: "absolute",
  },
  stone: {
    borderWidth: 0,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
    opacity: 1,
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyGrid: {
    opacity: 0.32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 1,
  },
  transparent: {
    opacity: 0,
  },
  territoryOnStone: {
    position: "absolute",
  },
});
