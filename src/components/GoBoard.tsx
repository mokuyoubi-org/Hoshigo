// import React from "react";
// import { Pressable, StyleSheet, Text, View } from "react-native";
// import { Board, GoString, Grid } from "../lib/goLogics";
// import { Agehama } from "../lib/goUtils";
// import { useTheme } from "../lib/useTheme";

// const BOARD_PIXEL_SIZE = 300;
// const BOARD_SIZE_COUNT = 9;
// const CELL_SIZE = BOARD_PIXEL_SIZE / (BOARD_SIZE_COUNT - 1);
// const STONE_PIXEL_SIZE = 36;
// // アゲハマを表示するヘルパーコンポーネント
// const AgehamaDisplay: React.FC<{ count: number; isBlack: boolean }> = ({
//   count,
//   isBlack,
// }) => {
//   const { colors } = useTheme();

//   // 0の場合は何も表示しない
//   if (count === 0) {
//     return <View style={styles.agehamaContainer} />;
//   }

//   const stoneStyle = isBlack
//     ? {
//         backgroundColor: colors.whiteStone,
//         borderWidth: 1.5,
//         borderColor: colors.subtext,
//       }
//     : {
//         backgroundColor: colors.blackStone,
//         borderWidth: 1.5,
//         borderColor: colors.subtext,
//       };

//   // 5つ以上の場合はテキスト形式で表示
//   if (count >= 5) {
//     return (
//       <View style={styles.agehamaContainer}>
//         <View style={[styles.agehamaTextStone, stoneStyle]} />
//         <Text
//           style={[
//             styles.agehamaText,
//             { color: colors.blackStone },
//             isBlack && { color: colors.whiteStone },
//           ]}
//         >
//           ...{count}
//         </Text>
//       </View>
//     );
//   }

//   // 5つ未満の場合は石を並べて表示
//   return (
//     <View style={styles.agehamaContainer}>
//       {Array.from({ length: count }).map((_, index) => (
//         <View
//           key={`stone-${index}`}
//           style={[styles.agehamaTextStone, stoneStyle]}
//         />
//       ))}
//     </View>
//   );
// };
// interface GoBoardProps {
//   currentIndex: number; // 🌟
//   board: Board; // 🌟
//   onPutStone: (grid: Grid) => void; // 🌟
//   moveHistory?: string[];
//   territoryBoard?: number[][];
//   showTerritory?: boolean;
//   disabled?: boolean;
//   stoneShadow?: boolean;
//   agehamaHistory: Agehama[]; // 🌟
// }

// export const GoBoard: React.FC<GoBoardProps> = ({
//   currentIndex: currentIndex,
//   board,
//   onPutStone,
//   moveHistory = [],
//   territoryBoard,
//   showTerritory = false,
//   disabled = false,
//   stoneShadow = true,
//   agehamaHistory,
// }) => {
//   const { colors } = useTheme();

//   const getStoneStyle = (
//     goString: GoString,
//     row: number,
//     col: number,
//     territoryValue?: number,
//   ) => {
//     if (!goString) return null;

//     const isCurrentMove =
//       moveHistory.length > 0 &&
//       Number(moveHistory[currentIndex - 1]?.[0]) === row &&
//       Number(moveHistory[currentIndex - 1]?.[2]) === col;
//     const isDead = territoryValue === 3;
//     const { color } = goString;

//     if (isDead && showTerritory) {
//       return color === "black"
//         ? { backgroundColor: colors.blackStone, opacity: 0.48 }
//         : { backgroundColor: colors.whiteStone, opacity: 0.48 };
//     }
//     if (isCurrentMove) {
//       return color === "black"
//         ? {
//             backgroundColor: colors.blackStoneCurrent,
//             borderWidth: STONE_PIXEL_SIZE * 0.24,
//             borderColor: colors.blackStone,
//           }
//         : {
//             backgroundColor: colors.whiteStoneCurrent,
//             borderWidth: STONE_PIXEL_SIZE * 0.24,
//             borderColor: colors.whiteStone,
//           };
//     }
//     return color === "black"
//       ? { backgroundColor: colors.blackStone }
//       : { backgroundColor: colors.whiteStone };
//   };

//   return (
//     <View>
//       {/* 横並びレイアウト: 黒アゲハマ - パス - 白アゲハマ */}
//       <View style={styles.topInfoContainer}>
//         {/* 黒のアゲハマ */}
//         <View style={styles.agehamaSection}>
//           <AgehamaDisplay
//             count={agehamaHistory[currentIndex].black}
//             isBlack={true}
//           />
//         </View>

//         {/* パス表示 */}
//         <View style={styles.passIndicatorContainer}>
//           {currentIndex % 2 === 1 && moveHistory[currentIndex - 1] === "p" && (
//             <View
//               style={[
//                 styles.passBadge,
//                 {
//                   backgroundColor: colors.blackStone,
//                 },
//               ]}
//             >
//               <Text style={[styles.passText, { color: colors.whiteStone }]}>
//                 黒パス
//               </Text>
//             </View>
//           )}
//           {currentIndex % 2 === 0 && moveHistory[currentIndex - 1] === "p" && (
//             <View
//               style={[
//                 styles.passBadge,
//                 {
//                   backgroundColor: colors.whiteStone,
//                   borderWidth: 1,
//                   borderColor: colors.gridLine,
//                 },
//               ]}
//             >
//               <Text style={[styles.passText, { color: colors.blackStone }]}>
//                 白パス
//               </Text>
//             </View>
//           )}
//         </View>

//         {/* 白のアゲハマ */}
//         <View style={styles.agehamaSection}>
//           <AgehamaDisplay
//             count={agehamaHistory[currentIndex].white}
//             isBlack={false}
//           />
//         </View>
//       </View>

//       {/*碁盤部分*/}
//       <View
//         style={[
//           styles.boardContainer,
//           {
//             backgroundColor: colors.gridBackground,
//             borderColor: colors.borderColor,
//           },
//         ]}
//       >
//         <View style={styles.boardWrapper}>
//           {/* 碁盤の線を描画 */}
//           {Array.from({ length: BOARD_SIZE_COUNT }).map((_, i) => (
//             <React.Fragment key={`line-${i}`}>
//               <View
//                 style={[
//                   styles.verticalLine,
//                   { left: i * CELL_SIZE, backgroundColor: colors.gridLine },
//                 ]}
//               />
//               <View
//                 style={[
//                   styles.horizontalLine,
//                   { top: i * CELL_SIZE, backgroundColor: colors.gridLine },
//                 ]}
//               />
//             </React.Fragment>
//           ))}

//           {/* 星（ほし）を描画 */}
//           <StarPoint row={3} col={3} colors={colors} />
//           <StarPoint row={3} col={7} colors={colors} />
//           <StarPoint row={7} col={3} colors={colors} />
//           <StarPoint row={7} col={7} colors={colors} />
//           <StarPoint row={5} col={5} colors={colors} />

//           {/* 碁石と着手可能エリア */}
//           {Object.entries(board).map(([key, goString]) => {
//             const [row, col] = key.split(",").map(Number);
//             const territoryValue = territoryBoard?.[row - 1]?.[col - 1];

//             return (
//               <Pressable
//                 key={key}
//                 onPress={() => !disabled && onPutStone({ row, col })}
//                 style={[
//                   styles.intersection,
//                   {
//                     left: (col - 1) * CELL_SIZE - CELL_SIZE / 2 + 1,
//                     top: (row - 1) * CELL_SIZE - CELL_SIZE / 2 + 1,
//                   },
//                 ]}
//                 disabled={disabled}
//               >
//                 {goString && (
//                   <>
//                     <View
//                       style={[
//                         styles.stone,
//                         getStoneStyle(goString, row, col, territoryValue),
//                         !stoneShadow && { shadowOpacity: 0, elevation: 0 },
//                       ]}
//                     />
//                     {/* deadStonesの上にも陣地表示を重ねる */}
//                     {territoryValue === 3 && showTerritory && (
//                       <View
//                         style={[
//                           styles.emptyGrid,
//                           {
//                             backgroundColor:
//                               goString.color === "black"
//                                 ? colors.whiteStone
//                                 : colors.blackStone,
//                           },
//                           styles.territoryOnStone,
//                         ]}
//                       />
//                     )}
//                   </>
//                 )}

//                 {!goString && showTerritory && territoryBoard && (
//                   <View
//                     style={[
//                       styles.emptyGrid,
//                       {
//                         backgroundColor:
//                           territoryValue === 1
//                             ? colors.blackStone
//                             : territoryValue === 2
//                               ? colors.whiteStone
//                               : "transparent",
//                       },
//                       territoryValue === 0 && { opacity: 0 },
//                     ]}
//                   />
//                 )}
//               </Pressable>
//             );
//           })}
//         </View>
//       </View>
//     </View>
//   );
// };

// // 星を描画するコンポーネント
// const StarPoint: React.FC<{ row: number; col: number; colors: any }> = ({
//   row,
//   col,
//   colors,
// }) => {
//   return (
//     <View
//       style={[
//         styles.starPoint,
//         {
//           left: (col - 1) * CELL_SIZE,
//           top: (row - 1) * CELL_SIZE,
//           backgroundColor: colors.gridLine,
//         },
//       ]}
//     />
//   );
// };

// const styles = StyleSheet.create({
//   topInfoContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 8,
//   },
//   agehamaSection: {
//     flex: 1,
//   },
//   passIndicatorContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   passBadge: {
//     paddingHorizontal: 16,
//     paddingVertical: 6,
//     borderRadius: 16,
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.15,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   passText: {
//     fontSize: 14,
//     fontWeight: "600",
//     letterSpacing: 0.5,
//   },
//   agehamaContainer: {
//     width: 100,
//     height: 40,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 4,
//   },
//   agehamaTextStone: {
//     width: 16,
//     height: 16,
//     borderRadius: 8,
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.15,
//     shadowRadius: 1,
//     elevation: 1,
//   },
//   agehamaText: {
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   boardContainer: {
//     padding: 32,
//     borderRadius: 20,
//     borderWidth: 1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   boardWrapper: {
//     width: BOARD_PIXEL_SIZE,
//     height: BOARD_PIXEL_SIZE,
//     position: "relative",
//   },
//   verticalLine: {
//     position: "absolute",
//     width: 2,
//     height: BOARD_PIXEL_SIZE,
//   },
//   horizontalLine: {
//     position: "absolute",
//     width: BOARD_PIXEL_SIZE,
//     height: 2,
//   },
//   intersection: {
//     position: "absolute",
//     width: CELL_SIZE,
//     height: CELL_SIZE,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   starPoint: {
//     position: "absolute",
//     width: 12,
//     height: 12,
//     borderRadius: 16,
//     transform: [{ translateX: -5 }, { translateY: -5 }],
//   },

//   stone: {
//     width: STONE_PIXEL_SIZE,
//     height: STONE_PIXEL_SIZE,
//     borderRadius: STONE_PIXEL_SIZE / 2,
//     borderWidth: 0,
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.15,
//     shadowRadius: 2,
//     elevation: 1,
//     opacity: 1,
//   },
//   emptyGrid: {
//     width: STONE_PIXEL_SIZE / 2,
//     height: STONE_PIXEL_SIZE / 2,
//     borderRadius: 4,
//     opacity: 0.32,
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0,
//     shadowRadius: 0,
//     elevation: 1,
//     // transform: [{ translateX: 1 }, { translateY: 1 }],
//   },
//   territoryOnStone: {
//     position: "absolute",
//   },
// });


import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Board, GoString, Grid } from "../lib/goLogics";
import { Agehama } from "../lib/goUtils";
import { useTheme } from "../lib/useTheme";

const BOARD_PIXEL_SIZE = 300;
const BOARD_SIZE_COUNT = 9;
const CELL_SIZE = BOARD_PIXEL_SIZE / (BOARD_SIZE_COUNT - 1);
const STONE_PIXEL_SIZE = 36;
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
          ...{count}
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
  currentIndex: number; // 🌟
  board: Board; // 🌟
  onPutStone: (grid: Grid) => void; // 🌟
  moveHistory?: string[];
  territoryBoard?: number[][];
  showTerritory?: boolean;
  disabled?: boolean;
  stoneShadow?: boolean;
  agehamaHistory: Agehama[]; // 🌟
}

export const GoBoard: React.FC<GoBoardProps> = ({
  currentIndex: currentIndex,
  board,
  onPutStone,
  moveHistory = [],
  territoryBoard,
  showTerritory = false,
  disabled = false,
  stoneShadow = true,
  agehamaHistory,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const getStoneStyle = (
    goString: GoString,
    row: number,
    col: number,
    territoryValue?: number,
  ) => {
    if (!goString) return null;

    const isCurrentMove =
      moveHistory.length > 0 &&
      Number(moveHistory[currentIndex - 1]?.[0]) === row &&
      Number(moveHistory[currentIndex - 1]?.[2]) === col;
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
            borderWidth: STONE_PIXEL_SIZE * 0.24,
            borderColor: colors.blackStone,
          }
        : {
            backgroundColor: colors.whiteStoneCurrent,
            borderWidth: STONE_PIXEL_SIZE * 0.24,
            borderColor: colors.whiteStone,
          };
    }
    return color === "black"
      ? { backgroundColor: colors.blackStone }
      : { backgroundColor: colors.whiteStone };
  };

  return (
    <View>
      {/* 横並びレイアウト: 黒アゲハマ - パス - 白アゲハマ */}
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
          {currentIndex % 2 === 1 && moveHistory[currentIndex - 1] === "p" && (
            <View
              style={[
                styles.passBadge,
                {
                  backgroundColor: colors.blackStone,
                },
              ]}
            >
              <Text style={[styles.passText, { color: colors.whiteStone }]}>
                {t("GoBoard.blackPass")}
              </Text>
            </View>
          )}
          {currentIndex % 2 === 0 && moveHistory[currentIndex - 1] === "p" && (
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
      </View>

      {/*碁盤部分*/}
      <View
        style={[
          styles.boardContainer,
          {
            backgroundColor: colors.gridBackground,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <View style={styles.boardWrapper}>
          {/* 碁盤の線を描画 */}
          {Array.from({ length: BOARD_SIZE_COUNT }).map((_, i) => (
            <React.Fragment key={`line-${i}`}>
              <View
                style={[
                  styles.verticalLine,
                  { left: i * CELL_SIZE, backgroundColor: colors.gridLine },
                ]}
              />
              <View
                style={[
                  styles.horizontalLine,
                  { top: i * CELL_SIZE, backgroundColor: colors.gridLine },
                ]}
              />
            </React.Fragment>
          ))}

          {/* 星(ほし)を描画 */}
          <StarPoint row={3} col={3} colors={colors} />
          <StarPoint row={3} col={7} colors={colors} />
          <StarPoint row={7} col={3} colors={colors} />
          <StarPoint row={7} col={7} colors={colors} />
          <StarPoint row={5} col={5} colors={colors} />

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
                        !stoneShadow && { shadowOpacity: 0, elevation: 0 },
                      ]}
                    />
                    {/* deadStonesの上にも陣地表示を重ねる */}
                    {territoryValue === 3 && showTerritory && (
                      <View
                        style={[
                          styles.emptyGrid,
                          {
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
                        backgroundColor:
                          territoryValue === 1
                            ? colors.blackStone
                            : territoryValue === 2
                              ? colors.whiteStone
                              : "transparent",
                      },
                      territoryValue === 0 && { opacity: 0 },
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
const StarPoint: React.FC<{ row: number; col: number; colors: any }> = ({
  row,
  col,
  colors,
}) => {
  return (
    <View
      style={[
        styles.starPoint,
        {
          left: (col - 1) * CELL_SIZE,
          top: (row - 1) * CELL_SIZE,
          backgroundColor: colors.gridLine,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
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
    width: BOARD_PIXEL_SIZE,
    height: BOARD_PIXEL_SIZE,
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    width: 2,
    height: BOARD_PIXEL_SIZE,
  },
  horizontalLine: {
    position: "absolute",
    width: BOARD_PIXEL_SIZE,
    height: 2,
  },
  intersection: {
    position: "absolute",
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  starPoint: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 16,
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },

  stone: {
    width: STONE_PIXEL_SIZE,
    height: STONE_PIXEL_SIZE,
    borderRadius: STONE_PIXEL_SIZE / 2,
    borderWidth: 0,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
    opacity: 1,
  },
  emptyGrid: {
    width: STONE_PIXEL_SIZE / 2,
    height: STONE_PIXEL_SIZE / 2,
    borderRadius: 4,
    opacity: 0.32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 1,
    // transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  territoryOnStone: {
    position: "absolute",
  },
});