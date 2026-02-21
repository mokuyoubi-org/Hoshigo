// Tsumego.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GoNode, Tsumego, TSUMEGO_GROUPS } from "../../src/lib/tsumegoData";

import { CPUMessage } from "@/src/components/CPUMessage";
import { GoBoard } from "@/src/components/GoBoard";
import { StarBackground } from "@/src/components/StarBackGround";
import {
  applyMove,
  Board,
  // BOARD_SIZE_COUNT,
  cloneBoard,
  Color,
  getOppositeColor,
  Grid,
  initializeBoard,
  isLegalMove,
  keyToGrid,
  stringifyGrid,
} from "@/src/lib/goLogics";
import { Agehama, prepareBoard2d, sleep } from "@/src/lib/goUtils";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TsumegoPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  console.log("params:", params); // まず確認！
  console.log("params:", params); // ← これを追加
  console.log("groupId:", params.groupId);
  console.log("index:", params.index);
  const tsumegoIndex = Number(
    Array.isArray(params.index) ? params.index[0] : params.index,
  );
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;

  const [tsumegoId, setTsumegoId] = useState(tsumegoIndex);
  const group =
    TSUMEGO_GROUPS.find((g) => g.id === groupId) ?? TSUMEGO_GROUPS[0];
  const tsumego = group.data[tsumegoId] ?? group.data[0];

  const [displayedText, setDisplayedText] = useState("");
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Board state
  const currentColorRef = useRef<Color>("black");
  const [currentBoard, setBoard] = useState<Board>(
    prepareBoard2d(tsumego?.board ?? [], tsumego?.boardSize ?? 9),
  );
  const currentBoardRef = useRef<Board>(
    prepareBoard2d(tsumego?.board ?? [], tsumego?.boardSize ?? 9),
  );
  const boardHistoryRef = useRef<Board[]>([initializeBoard(tsumego.boardSize)]);
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);
  const teritoryBoardRef = useRef<number[][]>( // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
    Array.from({ length: tsumego.boardSize }, () =>
      Array.from({ length: tsumego.boardSize }, () => 0),
    ),
  );
  // Move state
  const [lastMove, setLastMove] = useState<Grid | null>(null);
  const movesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  // const canPutStonesRef = useRef<string[]>([]);

  // ノード
  const currentGoNodeRef = useRef<GoNode | Tsumego>(tsumego);

  useEffect(() => {
    if (!tsumego) return;
    handleReset();
    animateText(tsumego.description || "がんばって！");
  }, [tsumegoId]);

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

  const applyMoveCommon = (grid: Grid, boardSize: number) => {
    if (
      !isLegalMove(
        boardSize,
        grid,
        currentBoardRef.current,
        lastMove,
        currentColorRef.current,
        boardHistoryRef.current[boardHistoryRef.current.length - 2] ||
          initializeBoard(boardSize),
      )
    ) {
      return false;
    }

    const { board: newBoard, agehama } = applyMove(
      tsumego.boardSize,
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

  const handlePutStone = async (grid: Grid, boardSize: number) => {
    const currentTsumego = tsumego;
    if (!currentTsumego || gameOver || disabled) return;

    // 合法でなければ何もしない
    if (
      !isLegalMove(
        boardSize,
        grid,
        currentBoardRef.current,
        lastMove,
        currentColorRef.current,
        boardHistoryRef.current[boardHistoryRef.current.length - 2] ||
          initializeBoard(boardSize),
      )
    ) {
      animateText("そこには打てないよ");
      return false;
    }

    // 石を配置
    applyMoveCommon(grid, boardSize);

    // 手を探す
    const nextNode = currentGoNodeRef.current.nexts.find(
      (node) => node.move === stringifyGrid(grid),
    );

    if (nextNode) {
      // コメントをアニメーション表示
      animateText(nextNode.comment);

      if (nextNode.status === "correct") {
        // 登録されている正解の手
        setGameOver(true);
        setIsCorrect(true);
      } else if (nextNode.status === "wrong") {
        // 登録されている間違いの手
        setGameOver(true);
        setDisabled(true);
      } else {
        setDisabled(true);
        await sleep(400);
        // 登録されている道中の手は相手が打ち返してくる
        const nextNextNode: GoNode =
          nextNode.nexts[Math.floor(Math.random() * nextNode.nexts.length)];
        applyMoveCommon(keyToGrid(nextNextNode.move), boardSize);
        currentGoNodeRef.current = nextNextNode;
        animateText(nextNextNode.comment);
        setDisabled(false);
      }
    } else {
      // 登録されていない手
      setDisabled(true);
      animateText("おしい！もっといい手があるかも");
    }
  };

  const handleReset = () => {
    if (!tsumego) return;
    currentGoNodeRef.current = tsumego;
    currentColorRef.current = "black";
    setBoard(prepareBoard2d(tsumego?.board ?? [], tsumego?.boardSize ?? 9));
    currentBoardRef.current = prepareBoard2d(
      tsumego?.board ?? [],
      tsumego?.boardSize ?? 9,
    );
    boardHistoryRef.current = [
      prepareBoard2d(tsumego?.board ?? [], tsumego?.boardSize ?? 9),
    ];
    setAgehamaHistory([{ black: 0, white: 0 }]);
    agehamaHistoryRef.current = [{ black: 0, white: 0 }];
    teritoryBoardRef.current = // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
      Array.from({ length: tsumego.boardSize }, () =>
        Array.from({ length: tsumego.boardSize }, () => 0),
      );
    // Move state
    setLastMove(null);
    movesRef.current = [];
    currentIndexRef.current = 0;

    setGameOver(false);
    setIsCorrect(false);
    setDisabled(false);
    animateText(tsumego.description || "がんばって！");
  };

  const handleNext = () => {
    setTsumegoId((prev) => {
      if (prev >= group.data.length - 1) return prev;
      return prev + 1;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StarBackground />

      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/TsumegoList")}
          >
            <Text style={styles.backButtonText}>‹ もどる</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lessonCard}>
          {/* <Text>{tsumego.title}</Text> */}
          {/* 碁盤 */}
          <View style={styles.boardWrapper}>
            <View style={styles.boardWrapper}>
              <GoBoard
                boardSize={tsumego.boardSize}
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
          <CPUMessage text={displayedText} fadeAnim={fadeAnim} />

          {/* ナビゲーション */}
          <View style={styles.navigationButtons}>
            {/* リセットボタン */}
            <TouchableOpacity
              style={[styles.navButton, styles.buttonReset]}
              onPress={handleReset}
            >
              <Text style={styles.navButtonText}>リセット</Text>
            </TouchableOpacity>

            {/* 次へボタン（正解時のみ） */}
            {gameOver &&
              isCorrect &&
              isAnimationComplete &&
              tsumegoId < group.data.length - 1 && (
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
    justifyContent: "center",
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
