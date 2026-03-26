// Tsumego.tsx
import { GoBoard } from "@/src/components/GoComponents/GoBoard";
import { TextPanel } from "@/src/components/TextPanel";
import { Agehama } from "@/src/constants/goConstants";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import {
  applyMove,
  Board,
  cloneBoard,
  Color,
  getOppositeColor,
  Grid,
  initializeBoard,
  isLegalMove,
  stringifyGrid,
  stringToGrid,
} from "@/src/lib/goLogics";
import { prepareBoard2d } from "@/src/lib/goUtils";
import { GoNode, Tsumego, TSUMEGO_GROUPS } from "@/src/lib/tsumegoData";
import { sleep } from "@/src/lib/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function TsumegoPage() {
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const tsumegoIndex = Number(
    Array.isArray(params.index) ? params.index[0] : params.index,
  );
  const groupId = Array.isArray(params.groupId)
    ? Number(params.groupId[0])
    : Number(params.groupId);

  const [tsumegoId, setTsumegoId] = useState(tsumegoIndex);
  const group =
    TSUMEGO_GROUPS.find((g, index) => index === groupId) ?? TSUMEGO_GROUPS[0];
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
    prepareBoard2d(tsumego?.board ?? [], tsumego?.board.length ?? 9),
  );
  const currentBoardRef = useRef<Board>(
    prepareBoard2d(tsumego?.board ?? [], tsumego?.board.length ?? 9),
  );
  const boardHistoryRef = useRef<Board[]>([
    initializeBoard(tsumego.board.length),
  ]);
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);
  const teritoryBoardRef = useRef<number[][]>( // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
    Array.from({ length: tsumego.board.length }, () =>
      Array.from({ length: tsumego.board.length }, () => 0),
    ),
  );
  // Move state
  const [lastMove, setLastMove] = useState<Grid | null>(null);
  const movesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);

  // ノード
  const currentGoNodeRef = useRef<GoNode | Tsumego>(tsumego);
  function getRandomItem<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined; // 空配列は安全に対応
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }
  const [showQuiz, setShowQuiz] = useState<boolean>(false);

  const [pinPoints, setPinPoints] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    handleReset();
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
      tsumego.board.length,
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
    if (gameOver || disabled) return;

    if (pinPoints !== undefined && pinPoints.includes(stringifyGrid(grid))) {
      // ピンポイントが存在するときの挙動
      setPinPoints(undefined);
      setShowQuiz(false);
    } else {
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
        animateText(t("Tsumego.cannotPlace"));
        return false;
      }
    }

    // 合法手なので石を配置
    applyMoveCommon(grid, boardSize);

    // 手を探す
    const nextNode = currentGoNodeRef.current.nexts?.find(
      (node) => node.move === stringifyGrid(grid),
    );

    if (nextNode) {
      if (nextNode.isCorrect) {
        // コメントをアニメーション表示
        animateText(nextNode.comment ?? t("Tsumego.correct")); // 登録されている正解の手
        setDisabled(true);
        setGameOver(true);
        setIsCorrect(true);
      } else if (nextNode.isCorrect === false) {
        // コメントをアニメーション表示
        animateText(nextNode.comment ?? t("Tsumego.incorrect")); // 登録されている間違いの手
        setGameOver(true);
        setDisabled(true);
      } else {
        // コメントをアニメーション表示
        animateText(nextNode.comment ?? "");
        setDisabled(true);
        await sleep(400);
        // 登録されている道中の手は相手が打ち返してくる
        const nextNextNode: GoNode = nextNode.nexts?.[
          Math.floor(Math.random() * nextNode.nexts.length)
        ] || { move: "" };
        applyMoveCommon(stringToGrid(nextNextNode.move), boardSize);
        currentGoNodeRef.current = nextNextNode;
        if (currentGoNodeRef.current.isCorrect === undefined) {
          animateText(nextNextNode.comment ?? "");
          setDisabled(false);
        } else if (currentGoNodeRef.current.isCorrect) {
          animateText(nextNode.comment ?? t("Tsumego.correct"));
          setIsCorrect(true);
          setDisabled(true);
          setGameOver(true);
        } else {
          animateText(nextNode.comment ?? t("Tsumego.incorrect"));
          setDisabled(true);
          setGameOver(true);
        }
      }
    } else {
      // 登録されていない手
      setDisabled(true);
      animateText(t("Tsumego.incorrect"));
    }
  };

  const handleReset = async () => {
    // 初期準備編
    setShowQuiz(false);
    setPinPoints(undefined);
    setGameOver(false);
    setIsCorrect(false);
    currentGoNodeRef.current = tsumego;
    if (tsumego.isNextBlack === false) {
      currentColorRef.current = "white";
    } else {
      currentColorRef.current = "black";
    }
    setBoard(prepareBoard2d(tsumego?.board ?? [], tsumego?.board.length ?? 9));
    currentBoardRef.current = prepareBoard2d(
      tsumego?.board ?? [],
      tsumego?.board.length ?? 9,
    );
    boardHistoryRef.current = [
      prepareBoard2d(tsumego?.board ?? [], tsumego?.board.length ?? 9),
    ];
    setAgehamaHistory([{ black: 0, white: 0 }]);
    agehamaHistoryRef.current = [{ black: 0, white: 0 }];
    teritoryBoardRef.current = // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
      Array.from({ length: tsumego.board.length }, () =>
        Array.from({ length: tsumego.board.length }, () => 0),
      );
    // Move state
    setLastMove(null);
    movesRef.current = [];
    currentIndexRef.current = 0;

    setDisabled(true);
    animateText(tsumego.comment || "");

    // もしautoPlayなら、autoPlayする

    let node = currentGoNodeRef.current as Tsumego | GoNode;
    while (node && "nexts" in node && node.nexts && node.nexts.length > 0) {
      const nextNode = getRandomItem(node.nexts);
      if (!nextNode || !("autoPlay" in nextNode)) break;

      const goNode = nextNode as GoNode;
      if (!goNode.autoPlay) break;

      currentGoNodeRef.current = goNode;

      await sleep(1000);
      applyMoveCommon(stringToGrid(goNode.move), tsumego.board.length);
      animateText(currentGoNodeRef.current.comment || "");
      node = goNode; // 次ループ用
    }

    // クイズならクイズを表示
    if (currentGoNodeRef.current.quizChoice !== undefined) {
      setShowQuiz(true);

      const ppList = currentGoNodeRef.current.quizChoice.filter((str) =>
        /\d{1,2},\d{1,2}/.test(str),
      );

      if (ppList.length > 0) {
        setPinPoints(ppList);
      }
    }

    setDisabled(false);
  };

  const handleNext = () => {
    setTsumegoId((prev) => {
      if (prev >= group.data.length - 1) return prev;
      return prev + 1;
    });
  };

  const handleBefore = () => {
    setTsumegoId((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  };

  const handleQuizChoice = (choice: string) => {
    setShowQuiz(false);
    setPinPoints(undefined);
    // 手を探す
    const nextNode = currentGoNodeRef.current.nexts?.find(
      (node) => node.move === choice,
    );

    if (!nextNode) return;
    if (nextNode.isCorrect) {
      // コメントをアニメーション表示
      animateText(nextNode.comment ?? "せいかい！");
      // 登録されている正解の手
      setDisabled(true);
      setGameOver(true);
      setIsCorrect(true);
    } else if (nextNode.isCorrect === false) {
      // コメントをアニメーション表示
      animateText(nextNode.comment ?? "おしい！ふせいかい");
      // 登録されている間違いの手
      setGameOver(true);
      setDisabled(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/TsumegoList")}
          >
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lessonCard}>
          {/* 碁盤 */}
          <View style={styles.boardWrapper}>
            <View style={styles.boardWrapper}>
              <GoBoard
                boardWidth={(height * 34) / 100}
                intersections={tsumego.board.length}
                territoryBoard={teritoryBoardRef.current}
                disabled={false}
                moveHistory={movesRef.current}
                currentIndex={currentIndexRef.current}
                board={currentBoard}
                onPutStone={handlePutStone}
                agehamaHistory={agehamaHistory}
                pinPoints={pinPoints}
                matchType={0}
                isGameEnded={false}
                boardHistory={[]}
              />
            </View>
          </View>

          {/* 説明パネル */}
          <TextPanel text={displayedText} fadeAnim={fadeAnim} />

          {/* ナビゲーション */}
          <View
            style={[styles.navigationButtons, { height: (height * 8) / 100 }]}
          >
            {/* 戻るボタン（正解時のみ） */}
            {gameOver && isCorrect && isAnimationComplete && 0 < tsumegoId && (
              <TouchableOpacity
                style={[styles.navButton, styles.buttonComplete]}
                onPress={handleBefore}
              >
                <Text style={styles.navButtonText}>
                  ← {t("Tsumego.previous")}
                </Text>
              </TouchableOpacity>
            )}

            {/* リセットボタン */}
            <TouchableOpacity
              style={[styles.navButton, styles.buttonReset]}
              onPress={handleReset}
            >
              <Text style={styles.navButtonText}>{t("Tsumego.reset")}</Text>
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
                  <Text style={styles.navButtonText}>
                    {t("Tsumego.next")} →
                  </Text>
                </TouchableOpacity>
              )}

            {/* クイズボタン（クイズの時のみ） */}
            {isAnimationComplete &&
              showQuiz &&
              currentGoNodeRef.current.quizChoice !== undefined &&
              currentGoNodeRef.current.quizChoice
                .filter((choice) => !/^\d{1,2},\d{1,2}$/.test(choice))
                .map((choice, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.navButton, styles.buttonComplete]}
                    onPress={() => handleQuizChoice(choice)}
                  >
                    <Text style={styles.navButtonText}>{choice}</Text>
                  </TouchableOpacity>
                ))}
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
  },
  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 16,
  },


  navigationButtons: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 12,
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 120,
  },
  buttonReset: {
    backgroundColor: "#95a5a6",
  },
  buttonComplete: {
    backgroundColor: "#7ccd9e",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
