import { GoBoard } from "@/src/components/GoBoard";
import {
  applyMove,
  Board,
  BOARD_SIZE_COUNT,
  cloneBoard,
  Color,
  getOppositeColor,
  Grid,
  initializeBoard,
  isLegalMove,
  keyToGrid,
  stringifyGrid,
} from "@/src/lib/goLogics";
import { Agehama } from "@/src/lib/goUtils";
import { ICONS } from "@/src/lib/icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTutorialScreens, MyScreen } from "../src/components/TutorialData";
import { DisplayNameContext } from "../src/components/UserContexts";
import { useTheme } from "../src/lib/useTheme";

// ==================== コンポーネント ====================
export default function Tutorial() {
  const { colors } = useTheme();
  const displayname = useContext(DisplayNameContext);
  const params = useLocalSearchParams();
  const currentTutorialIndex = Number(params.lessonId);

  const screens = getTutorialScreens(displayname || "あなた");

  // Board state
  const currentColorRef = useRef<Color>("black");
  const [currentBoard, setBoard] = useState<Board>(initializeBoard());
  const currentBoardRef = useRef<Board>(initializeBoard());
  const boardHistoryRef = useRef<Board[]>([initializeBoard()]);
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);
  const teritoryBoardRef = useRef<number[][]>( // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
    Array.from({ length: BOARD_SIZE_COUNT }, () =>
      Array.from({ length: BOARD_SIZE_COUNT }, () => 0),
    ),
  );
  // Move state
  const [lastMove, setLastMove] = useState<Grid | null>(null);
  const movesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const canPutStonesRef = useRef<string[]>([]);

  // UI state
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isAnimationComplete, setIsAnimationComplete] =
    useState<boolean>(false);
  const currentScreenIndexRef = useRef<number>(0); // 最初は0。🌟
  const [currentScreenIndex, setCurrentScreenIndex] = useState<number>(0); // 最初は0。🌟
  // const [canGoNext, setCanGoNext] = useState<boolean>(true);
  // const [isQuiz, setIsQuiz] = useState<boolean>(false);
  // const autoGoNextRef = useRef<boolean>(false);
  // const [autoGoNext, setAutoGoNext] = useState<boolean>(false);
  const [showNextButton, setShowNextButton] = useState<boolean>(false);
  const [showBackButton, setShowBackButton] = useState<boolean>(false);
  const [showQuizButton, setShowQuizButton] = useState<boolean>(false);
  // const currentScreen = screens[currentTutorialIndex]?.[currentScreenIndex]; // と言うわけで、最初は最初のスクリーンが入ってる

  // Text animation effect
  // const animateSentence = () => {
  //   // console.log("ここ");
  //   setDisplayedText("");
  //   setIsAnimationComplete(false);

  //   if (!screens[currentTutorialIndex][currentScreenIndexRef.current]) return;

  //   const fullText =
  //     screens[currentTutorialIndex][currentScreenIndexRef.current].sentence;
  //   let currentIndex = 0;

  //   const intervalId = setInterval(() => {
  //     if (currentIndex < fullText.length) {
  //       setDisplayedText(fullText.substring(0, currentIndex + 1));
  //       currentIndex++;
  //     } else {
  //       setIsAnimationComplete(true);
  //       clearInterval(intervalId);
  //     }
  //   }, 24);

  //   return () => clearInterval(intervalId);
  // };

  const animateSentence = (): Promise<void> => {
    return new Promise((resolve) => {
      setDisplayedText("");
      setIsAnimationComplete(false);

      const screen =
        screens[currentTutorialIndex][currentScreenIndexRef.current];

      if (!screen) {
        resolve();
        return;
      }

      const fullText = screen.sentence;
      let currentIndex = 0;

      const intervalId = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedText(fullText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsAnimationComplete(true);
          clearInterval(intervalId);
          resolve(); // 👈 ここが超重要にゃん！！！！
        }
      }, 24);
    });
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const replayBoard = async (replayCount: number = 0) => {
    let length;
    if (replayCount !== 0) {
      length = replayCount;
    } else {
      length = movesRef.current.length;
    }
    for (let i = 0; i < length; i++) {
      currentColorRef.current = getOppositeColor(currentColorRef.current);
      boardHistoryRef.current.pop();
      currentBoardRef.current =
        boardHistoryRef.current[boardHistoryRef.current.length - 1];
      setBoard(currentBoardRef.current);
      movesRef.current.pop();
      const lastKey = movesRef.current.at(-1);
      setLastMove(lastKey ? keyToGrid(lastKey) : null);
      currentIndexRef.current--;
      agehamaHistoryRef.current.pop();
      setAgehamaHistory(agehamaHistoryRef.current);
      await sleep(20);
    }
    await sleep(200);
  };

  const clearBoard = async () => {
    teritoryBoardRef.current = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => 0),
    );
    const length = movesRef.current.length;

    for (let i = 0; i < length; i++) {
      currentColorRef.current = getOppositeColor(currentColorRef.current);
      boardHistoryRef.current.pop();
      currentBoardRef.current =
        boardHistoryRef.current[boardHistoryRef.current.length - 1];
      setBoard(currentBoardRef.current);
      movesRef.current.pop();
      const lastKey = movesRef.current.at(-1);
      setLastMove(lastKey ? keyToGrid(lastKey) : null);
      currentIndexRef.current--;
      agehamaHistoryRef.current.pop();
      setAgehamaHistory(agehamaHistoryRef.current);
      await sleep(20);
    }
    await sleep(200);
  };

  const applyMoveCommon = (grid: Grid) => {
    if (
      !isLegalMove(
        grid,
        currentBoardRef.current,
        lastMove,
        currentColorRef.current,
        boardHistoryRef.current[boardHistoryRef.current.length - 2] ||
          initializeBoard(),
      )
    ) {
      return false;
    }

    const { board: newBoard, agehama } = applyMove(
      grid,
      cloneBoard(currentBoardRef.current),
      currentColorRef.current,
    );

    setBoard(newBoard);
    currentBoardRef.current = newBoard;
    boardHistoryRef.current = [...boardHistoryRef.current, newBoard];

    const lastAgehama =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    if (currentColorRef.current === "black") {
      agehamaHistoryRef.current.push({
        ...lastAgehama,
        black: lastAgehama.black + agehama,
      });
    } else {
      agehamaHistoryRef.current.push({
        ...lastAgehama,
        white: lastAgehama.white + agehama,
      });
    }
    setAgehamaHistory(agehamaHistoryRef.current);

    setLastMove(grid);
    movesRef.current = [...movesRef.current, stringifyGrid(grid)];
    currentIndexRef.current++;
    currentColorRef.current = getOppositeColor(currentColorRef.current);

    return true;
  };

  const robotPutStones = async (moves: string[]) => {
    for (const move of moves) {
      applyMoveCommon(keyToGrid(move));
      await sleep(320);
    }
  };

  const userResolveRef = useRef<(() => void) | null>(null);

  const waitForUserPlay = () => {
    return new Promise<void>((resolve) => {
      userResolveRef.current = resolve;
    });
  };

  const operate = async (currentScreen: MyScreen) => {
    for (let operation of currentScreen.operations) {
      if (operation === "showSentence") {
        await animateSentence();
      } else if (operation === "autoGoNext") {
        onNextButton();
      } else if (operation === "botApplyMove") {
        await robotPutStones(currentScreen.botApplyMove);
      } else if (operation === "botReplayMove") {
        await replayBoard(currentScreen.botReplayMove);
      } else if (operation === "botSetBoard") {
        await clearBoard();
        await robotPutStones(currentScreen.botSetBoard);
      } else if (operation === "showNextButton") {
        // console.log("here");
        setShowNextButton(true);
      } else if (operation === "showBackButton") {
        setShowBackButton(true);
      } else if (operation === "showQuizButton") {
        setShowQuizButton(true);
      } else if (operation === "showTerritory") {
        teritoryBoardRef.current = currentScreen.territoryBoard;
      }
      // else if (operation === "userPlay") {
      //   // ちゃんとループを待たせる必要がある
      //   // ユーザの手を待つ
      // }
      else if (operation === "userPlay") {
        canPutStonesRef.current = currentScreen.canPutStones;
        console.log("ユーザ待ち...");
        await waitForUserPlay();
        console.log("ユーザ完了！");
      }
    }
  };

  // useEffect(() => {
  //   const currentScreen =
  //     screens[currentTutorialIndex][currentScreenIndexRef.current];
  //   operate(currentScreen);
  // }, []);

  useEffect(() => {
    console.log("useEffect初回");
    if (
      !screens ||
      currentTutorialIndex == null ||
      screens[currentTutorialIndex] == null
    ) {
      return;
    }

    const currentScreen =
      screens[currentTutorialIndex][currentScreenIndexRef.current];

    if (!currentScreen) return;

    operate(currentScreen);
  }, [currentTutorialIndex]);

  const makeDefault = async () => {
    setShowNextButton(false);
    setShowBackButton(false);
    setShowQuizButton(false);
    canPutStonesRef.current = [];
    // teritoryBoardRef.current = Array.from({ length: 9 }, () =>
    //   Array.from({ length: 9 }, () => 0),
    // );
  };

  // これはあくまで「次へボタン」を押した時の処理。それ以外では使わない。
  // ただただ、次のページへ行く。そして、そこに書いてあることをやる。
  const onNextButton = async () => {
    await makeDefault();
    if (
      screens[currentTutorialIndex][currentScreenIndexRef.current + 1] ===
      undefined
    ) {
      console.log("koko");
      router.replace({
        pathname: "/TutorialCompleted",
        params: { currentTutorialIndex },
      });
      return;
    }

    let currentScreen =
      screens[currentTutorialIndex][currentScreenIndexRef.current];
    console.log("currentScreen.sentence: ", currentScreen.sentence);

    console.log("currentScreen.operations: ", currentScreen.operations);
    currentScreenIndexRef.current +=
      currentScreen.nextIndex !== 1 ? currentScreen.nextIndex : 1;

    currentScreen =
      screens[currentTutorialIndex][currentScreenIndexRef.current];
    console.log("currentScreen.sentence: ", currentScreen.sentence);

    console.log("currentScreen.operations: ", currentScreen.operations);

    // currentScreenIndexRef.current++; // インデックス更新
    setCurrentScreenIndex(currentScreenIndexRef.current); // インデックス更新

    operate(currentScreen);
  };

  const onBackButton = async () => {
    makeDefault();

    // currentScreenIndexRef.current--; // インデックス更新
    // setCurrentScreenIndex(currentScreenIndexRef.current); // インデックス更新
    // const currentScreen =
    //   screens[currentTutorialIndex][currentScreenIndexRef.current];

    let currentScreen =
      screens[currentTutorialIndex][currentScreenIndexRef.current];
    console.log("currentScreen.sentence: ", currentScreen.sentence);

    console.log("currentScreen.operations: ", currentScreen.operations);
    currentScreenIndexRef.current +=
      currentScreen.replayIndex !== -1 ? currentScreen.replayIndex : -1;

    currentScreen =
      screens[currentTutorialIndex][currentScreenIndexRef.current];
    console.log("currentScreen.sentence: ", currentScreen.sentence);

    console.log("currentScreen.operations: ", currentScreen.operations);

    // currentScreenIndexRef.current++; // インデックス更新
    setCurrentScreenIndex(currentScreenIndexRef.current); // インデックス更新

    operate(currentScreen);
  };

  const onQuizButton = async (index: number) => {
    makeDefault();

    currentScreenIndexRef.current += index; // インデックス更新
    setCurrentScreenIndex(currentScreenIndexRef.current); // インデックス更新
    const currentScreen =
      screens[currentTutorialIndex][currentScreenIndexRef.current];

    operate(currentScreen);
  };

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  const handlePutStone = async (grid: Grid) => {
    if (!canPutStonesRef.current.includes(stringifyGrid(grid))) {
      return;
    }

    const success = applyMoveCommon(grid);
    if (success) {
      if (userResolveRef.current) {
        userResolveRef.current();
        userResolveRef.current = null;
      }
    }
  };

  // console.log("showNextButton:", showNextButton);
  // console.log("showBackButton:", showBackButton);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/TutorialList")}
            >
              <Text style={[styles.backButtonText, { color: colors.active }]}>
                ‹ 戻る
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lessonCard}>
            {/* 碁盤 */}
            <View style={styles.boardWrapper}>
              <GoBoard
                territoryBoard={teritoryBoardRef.current}
                showTerritory={true}
                disabled={false}
                moveHistory={movesRef.current}
                currentIndex={currentIndexRef.current}
                board={currentBoard}
                onPutStone={handlePutStone}
                agehamaHistory={agehamaHistory}
              />
            </View>

            {/* 説明パネル */}
            <View style={styles.explanationContainer}>
              <View style={styles.characterContainer}>
                <Image source={ICONS[100]} style={styles.characterImage} resizeMode="contain" />
              </View>
              <View style={styles.speechBubble}>
                <View style={styles.bubbleTriangle} />
                <Text style={styles.explanationText}>{displayedText}</Text>
              </View>
            </View>

            {/* ナビゲーション */}
            <View style={styles.navigationButtons}>
              {/* 戻るボタン */}
              {showBackButton && isAnimationComplete ? (
                // && canGoNext
                <TouchableOpacity
                  style={[
                    styles.navButton,

                    // screens[currentTutorialIndex][
                    //   currentScreenIndexRef.current + 1
                    // ] === null
                    styles.buttonComplete,
                  ]}
                  onPress={() => onBackButton()}
                >
                  <Text style={styles.navButtonText}>戻る</Text>
                </TouchableOpacity>
              ) : (
                <View></View>
              )}
              {/* 次へボタン */}
              {showNextButton && isAnimationComplete ? (
                <TouchableOpacity
                  style={[
                    styles.navButton,

                    // screens[currentTutorialIndex][
                    //   currentScreenIndexRef.current + 1
                    // ] === null
                    styles.buttonComplete,
                  ]}
                  onPress={() => onNextButton()}
                >
                  <Text style={styles.navButtonText}>
                    {screens[currentTutorialIndex][currentScreenIndex + 1] ===
                    undefined
                      ? "完了"
                      : "次へ →"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View></View>
              )}

              {/* クイズボタン */}
              {showQuizButton && isAnimationComplete ? (
                <View style={styles.quizContainer}>
                  {[1, 2, 3].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.quizButton,
                        !isAnimationComplete && styles.buttonDisabled,
                      ]}
                      onPress={() => onQuizButton(num)}
                      disabled={!isAnimationComplete}
                    >
                      <Text style={styles.quizButtonText}>
                        {"①②③"[num - 1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==================== スタイル ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 8,
  },

  header: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  lessonCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  boardWrapper: {
    marginBottom: 24,
  },
  explanationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    // marginBottom: 24,
    gap: 12,
  },
  characterContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#e8f4f8",
    position: "relative",
  },
  bubbleTriangle: {
    position: "absolute",
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 0,
    borderRightColor: "#e8f4f8",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  explanationText: {
    fontSize: 16,
    color: "#2c3e50",
    lineHeight: 24,
    fontWeight: "500",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  navButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonComplete: {
    backgroundColor: "#27ae60",
    alignSelf: "center",
  },
  buttonDisabled: {
    backgroundColor: "#bdc3c7",
    elevation: 0,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  quizContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    gap: 12,
  },
  quizButton: {
    flex: 1,
    backgroundColor: "#3498db",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
