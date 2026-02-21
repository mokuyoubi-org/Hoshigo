import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Board, GoString, Grid } from "../lib/goLogics";
import { Agehama } from "../lib/goUtils";

// ─── AgehamaDisplay（UIのみ変更） ────────────────────
const AgehamaDisplay: React.FC<{ count: number; isBlack: boolean }> = ({
  count,
  isBlack,
}) => {
  const { colors } = useTheme();

  if (count === 0) return <View style={styles.agehamaContainer} />;

  // 捕獲された石の色（捕った方の色 = 相手の石）
  const stoneStyle = isBlack
    ? {
        backgroundColor: colors.whiteStone,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
      }
    : {
        backgroundColor: colors.blackStone,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.4)",
      };

  if (count >= 5) {
    return (
      <View style={styles.agehamaContainer}>
        <View style={[styles.agehamaStone, stoneStyle]} />
        <Text
          style={[
            styles.agehamaText,
            { color: isBlack ? "#f0ebe3" : "#f0ebe3" },
          ]}
        >
          ×{count}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.agehamaContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={`stone-${i}`} style={[styles.agehamaStone, stoneStyle]} />
      ))}
    </View>
  );
};

// ─── 型定義（変更なし） ───────────────────────────────
interface GoBoardProps {
  matchType?: number;
  topBar?: boolean;
  boardSize?: number;
  currentIndex: number;
  board: Board;
  onPutStone: (grid: Grid, boardSize: number) => void;
  moveHistory?: string[];
  territoryBoard?: number[][];
  showTerritory?: boolean;
  disabled?: boolean;
  stoneShadow?: boolean;
  agehamaHistory: Agehama[];
  boardPixelSize?: number;
}

// ─── GoBoard（ロジック変更なし、UIのみ変更） ──────────
export const GoBoard: React.FC<GoBoardProps> = ({
  matchType = 0,
  topBar = true,
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
  boardPixelSize = 300,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // ── ロジック（変更なし） ──
  const BOARD_PIXEL_SIZE = boardPixelSize;
  const CELL_SIZE = BOARD_PIXEL_SIZE / (boardSize - 1);
  const STONE_PIXEL_SIZE = CELL_SIZE * 0.9;
  const LINE_WIDTH = Math.max(1, BOARD_PIXEL_SIZE / 200);
  const STAR_POINT_SIZE = Math.max(4, CELL_SIZE / 3);

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

  const lastMove = moveHistory[currentIndex - 1];
  const isPass = lastMove === "p";
  const isBlackPass =
    isPass &&
    ((currentIndex % 2 === 1 && (matchType === 0 || matchType === 1)) ||
      (currentIndex % 2 === 0 && matchType !== 0 && matchType !== 1));
  const isWhitePass =
    isPass &&
    ((currentIndex % 2 === 0 && (matchType === 0 || matchType === 1)) ||
      (currentIndex % 2 === 1 && matchType !== 0 && matchType !== 1));
  const dynamicPadding = boardPixelSize * 0.16;
  const dynamicRadius  = boardPixelSize * 0.06;
  // ── UI ──
  return (
    <View style={styles.container}>
      {/* ── トップバー（アゲハマ・パス表示） ── */}
      {topBar && (
        <View style={styles.topInfoContainer}>
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
              <View style={styles.passBadgeBlack}>
                <View style={styles.passBadgeDot} />
                <Text style={styles.passBadgeTextBlack}>
                  {t("GoBoard.blackPass")}
                </Text>
              </View>
            )}
            {isWhitePass && (
              <View style={styles.passBadgeWhite}>
                <View
                  style={[styles.passBadgeDot, { backgroundColor: "#1a1a1a" }]}
                />
                <Text style={styles.passBadgeTextWhite}>
                  {t("GoBoard.whitePass")}
                </Text>
              </View>
            )}
          </View>

          {/* 白のアゲハマ */}
          <View style={[styles.agehamaSection, styles.agehamaSectionRight]}>
            <AgehamaDisplay
              count={agehamaHistory[currentIndex].white}
              isBlack={false}
            />
          </View>
        </View>
      )}

      <View
        style={[
          styles.boardContainer,
          {
            backgroundColor: colors.gridBackground,
            borderColor: "rgba(201,168,76,0.2)",
            padding: dynamicPadding,
            borderRadius: dynamicRadius,
          },
        ]}
      >
        <View
          style={[
            styles.boardWrapper,
            { width: BOARD_PIXEL_SIZE, height: BOARD_PIXEL_SIZE },
          ]}
        >
          {/* 盤線 */}
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

          {/* 星 */}
          {boardSize === 9 && (
            <>
              {[
                [3, 3],
                [3, 7],
                [7, 3],
                [7, 7],
                [5, 5],
              ].map(([row, col]) => (
                <StarPoint
                  key={`star-${row}-${col}`}
                  row={row}
                  col={col}
                  colors={colors}
                  CELL_SIZE={CELL_SIZE}
                  starSize={STAR_POINT_SIZE}
                />
              ))}
            </>
          )}

          {/* 碁石・着手可能エリア */}
          {Object.entries(board).map(([key, goString]) => {
            const [row, col] = key.split(",").map(Number);
            const territoryValue = territoryBoard?.[row - 1]?.[col - 1];

            return (
              <Pressable
                key={key}
                onPress={() => !disabled && onPutStone({ row, col }, boardSize)}
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

// ─── StarPoint（変更なし） ────────────────────────────
const StarPoint: React.FC<{
  row: number;
  col: number;
  colors: any;
  CELL_SIZE: number;
  starSize: number;
}> = ({ row, col, colors, CELL_SIZE, starSize }) => (
  <View
    style={[
      styles.starPoint,
      {
        left: (col - 1) * (CELL_SIZE + 0.2),
        top: (row - 1) * (CELL_SIZE + 0.2),
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

// ─── スタイル ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  // ── トップバー ──
  topInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  agehamaSection: {
    flex: 1,
  },
  agehamaSectionRight: {
    alignItems: "flex-end",
  },
  agehamaContainer: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  agehamaStone: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  agehamaText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // パスバッジ
  passIndicatorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  passBadgeBlack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(20,20,20,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  passBadgeWhite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(240,235,227,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  passBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f0ebe3",
  },
  passBadgeTextBlack: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f0ebe3",
    letterSpacing: 0.5,
  },
  passBadgeTextWhite: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },

  // ── 碁盤 ──
  boardContainer: {
    // padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
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
  starPoint: {
    position: "absolute",
  },
  intersection: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  stone: {
    borderWidth: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
    opacity: 1,
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyGrid: {
    opacity: 0.32,
    shadowOpacity: 0,
    elevation: 1,
  },
  transparent: {
    opacity: 0,
  },
  territoryOnStone: {
    position: "absolute",
  },
});
