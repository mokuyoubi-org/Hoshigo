// Tsumego.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ICONS } from "../../src/constants/icons"; // アイコン画像のインポート
import { SHIROGUMI_TSUMEGO } from "../../src/lib/TsumegoData";

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
  stringifyGrid,
} from "@/src/lib/goLogics";
import { Agehama, prepareBoard2d } from "@/src/lib/goUtils";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTutorialScreens } from "../../src/components/TutorialData";
import { DisplayNameContext } from "../../src/components/UserContexts";
import { useTheme } from "../../src/hooks/useTheme";

export default function Tsumego() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tsumegoId, setTsumegoId] = useState(Number(params.id as string)); // 詰碁ID

  // 詰碁データを取得
  const [tsumego, setTsumego] = useState(
    SHIROGUMI_TSUMEGO.find((t) => t.id === tsumegoId),
  );

  // const [placedStones, setPlacedStones] = useState<
  //   { row: number; col: number; color: Color }[]
  // >([]);
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { colors } = useTheme();
  const displayname = useContext(DisplayNameContext);
  const screens = getTutorialScreens(displayname || "あなた");

  // Board state
  const currentColorRef = useRef<Color>("black");
  const [currentBoard, setBoard] = useState<Board>(
    prepareBoard2d(tsumego?.board ?? [], tsumego?.boardSize ?? 9),
  );
  const currentBoardRef = useRef<Board>(
    prepareBoard2d(tsumego?.board ?? [], tsumego?.boardSize ?? 9),
  );
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

  useEffect(() => {
    if (tsumego) {
      animateText(tsumego.description || "がんばって！");
    }
  }, [tsumego]);

  const animateText = (text: string) => {
    setIsAnimationComplete(false);
    setDisplayedText("");
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        setIsAnimationComplete(true);
      }
    }, 30);
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

  const handlePutStone = (grid: Grid) => {
    const currentTsumego = tsumego;
    if (!currentTsumego || gameOver || disabled) return;

    // 合法でなければ何もしない
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
      animateText("そこには打てないよ");
      return false;
    }

    // 手を探す
    const matchingNode = currentTsumego.sequence.find(
      (node) => node.move === stringifyGrid(grid),
    );

    if (matchingNode) {
      // 石を配置
      applyMoveCommon(grid);

      // コメントをアニメーション表示
      animateText(matchingNode.comment);

      if (matchingNode.status === "correct") {
        setGameOver(true);
        setIsCorrect(true);
      } else if (matchingNode.status === "wrong") {
        setDisabled(true);
        // 間違いの場合、2秒後にリセット
        setTimeout(() => {
          animateText(currentTsumego.description || "もう一度考えてみて！");
          setDisabled(false);
        }, 2500);
      }
    } else {
      // 定義されていない手
      animateText("もっといい手があるかも");
      setTimeout(() => {
        animateText(currentTsumego.description || "がんばって！");
      }, 1500);
    }
  };

  const handleReset = () => {
    if (!tsumego) return;
    setGameOver(false);
    setIsCorrect(false);
    setDisabled(false);
    animateText(tsumego.description || "がんばって！");
  };

  const handleNext = () => {
    setTsumegoId((prev) => prev + 1);
    setTsumego(SHIROGUMI_TSUMEGO.find((t) => t.id === tsumegoId));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹ 戻る</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lessonCard}>
          {/* 碁盤 */}
          <View style={styles.boardWrapper}>
            {/* <GoBoard
              board={tsumego.board}
              placedStones={placedStones}
              onPutStone={handlePutStone}
              disabled={disabled}
            /> */}

            <View style={styles.boardWrapper}>
              <GoBoard
                boardSize={5}
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
          </View>

          {/* 説明パネル */}
          <Animated.View
            style={[styles.explanationContainer, { opacity: fadeAnim }]}
          >
            <View style={styles.characterContainer}>
              <Image
                source={ICONS[100]}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.speechBubble}>
              <View style={styles.bubbleTriangle} />
              <Text style={styles.explanationText}>{displayedText}</Text>
            </View>
          </Animated.View>

          {/* ナビゲーション */}
          <View style={styles.navigationButtons}>
            {/* リセットボタン */}
            {!gameOver && isAnimationComplete && (
              <TouchableOpacity
                style={[styles.navButton, styles.buttonReset]}
                onPress={handleReset}
              >
                <Text style={styles.navButtonText}>リセット</Text>
              </TouchableOpacity>
            )}

            {/* 次へボタン（正解時のみ） */}
            {gameOver && isCorrect && isAnimationComplete && (
              <TouchableOpacity
                style={[styles.navButton, styles.buttonComplete]}
                onPress={handleNext}
              >
                <Text style={styles.navButtonText}>次の問題へ →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

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
    color: "#3498db",
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
    alignItems: "center",
    paddingVertical: 16,
  },
  boardContainer: {
    backgroundColor: "#daa520",
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  boardRow: {
    flexDirection: "row",
  },
  boardCell: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  boardLineH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#8b6914",
    top: 0,
    bottom: 0,
  },
  boardLineV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "#8b6914",
    left: 0,
    right: 0,
  },
  starPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2c3e50",
    position: "absolute",
  },
  stone: {
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1,
  },
  stoneHighlight: {
    width: "40%",
    height: "40%",
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    position: "absolute",
    top: "15%",
    left: "15%",
  },
  explanationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
    paddingHorizontal: 8,
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
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 12,
  },
  navButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  buttonReset: {
    backgroundColor: "#95a5a6",
  },
  buttonComplete: {
    backgroundColor: "#27ae60",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 18,
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 40,
  },
});
