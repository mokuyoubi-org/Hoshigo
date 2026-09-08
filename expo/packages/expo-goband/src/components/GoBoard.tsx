// GoBoard.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { COLORS } from "../constants/colors";
import { useSounds } from "../hooks/useSounds";
import {
  Agehama,
  BLACK,
  Board,
  BoardSize,
  Color,
  GoString,
  Grid,
  PASS_GRID,
} from "../types/go";
import { BoardLines } from "./BoardLines";
import { IntersectionContainer } from "./stones/IntersectionContainer";
const EMPTY_EDIT_MARKERS = new Map<Grid, "human" | "bot">();

type Props = {
  board: Board;
  onPutStone: (grid: Grid, boardSize: BoardSize) => void;
  moveHistory?: Grid[];
  territoryBoard?: number[][];
  disabled?: boolean;
  boardWidth: number;
  boardSize: BoardSize;
  isGameEnded: boolean;
  boardHistory: Board[];
  currentIndex: number;
  boardBackgroundColor?: string;
  lineColor?: string;
  agehamaHistory: Agehama[];
  pinPoints?: Grid[];
  editMarkers?: Map<Grid, "human" | "bot">;
  candidatePoints?: Grid[]; // 🐱 直近の手が悪手だった場合に見せる、代替候補の位置一覧
  moveEvaluationPoint?: Grid | null; // 🐱 良手・悪手マークを付ける対象のマス(=直近に打たれた手)
  moveEvaluation?: "good" | "bad"; // 🐱 その手の評価
  forceShowTerritory?: boolean; // 🐱 isGameEndedに関わらず地計算結果を強制表示するフラグ
  enableDoubleTap?: boolean;
  playerColor?: Color;
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
  boardWidth,
  pinPoints,
  editMarkers = EMPTY_EDIT_MARKERS, // 🐱 誰がその地点を打ったか(人間/ボット)を表すMap
  candidatePoints = [],
  moveEvaluationPoint = null,
  moveEvaluation,
  forceShowTerritory = false,
  enableDoubleTap = false,
  playerColor = BLACK,
}: Props) {
  const [pendingGrid, setPendingGrid] = useState<Grid | null>(null);

  // レンダー中のState調整（React公式推奨パターン）
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  const [prevTurn, setPrevTurn] = useState(playerColor);
  const [prevBoard, setPrevBoard] = useState(board);

  if (
    prevIndex !== currentIndex ||
    prevTurn !== playerColor ||
    prevBoard !== board
  ) {
    setPrevIndex(currentIndex);
    setPrevTurn(playerColor);
    setPrevBoard(board);
    setPendingGrid(null);
  }

  const {
    innerWidth,
    cellSize,
    stoneSize,
    lineWidth,
    paddingSize,
    radiusSize,
  } = useMemo(() => {
    const paddingRatio = 1.0; // 余白は 1マス分
    const cellSizeCalc = boardWidth / (boardSize - 1 + 2 * paddingRatio);
    const innerWidthCalc = cellSizeCalc * (boardSize - 1);
    const paddingSizeCalc = cellSizeCalc * paddingRatio;

    return {
      innerWidth: innerWidthCalc,
      cellSize: cellSizeCalc,
      stoneSize: cellSizeCalc * 0.9,
      lineWidth: Math.max(1, innerWidthCalc / 200),
      paddingSize: paddingSizeCalc,
      // 🐱 丸みも cellSize（1マス分）に比例させる
      // 例: 1マスの半分のサイズ（0.5）にすると、路盤サイズに応じて綺麗に縮小・拡大される♪
      radiusSize: cellSizeCalc * 0.5,
    };
  }, [boardWidth, boardSize]);

  const prevIndexRef = useRef<number | null>(null);

  const { playSound } = useSounds();

  useEffect(() => {
    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    if (prevIdx === null) return;
    if (currentIndex !== prevIdx + 1) return;

    const appliedMove = moveHistory[currentIndex - 1];

    // パスのときはパスの音、石を置いたときは石の音を鳴らす
    if (appliedMove === PASS_GRID) {
      playSound("pass", 0.2);
    } else {
      playSound("stone");
    }
  }, [currentIndex, moveHistory, playSound]);

  const handlePressGrid = useCallback(
    (grid: Grid, goString: GoString | null) => {
      if (disabled) return;

      if (goString) {
        setPendingGrid(null);
        return;
      }

      if (!enableDoubleTap || pendingGrid === grid) {
        onPutStone(grid, boardSize);
        setPendingGrid(null);
      } else {
        setPendingGrid(grid);
      }
    },
    [disabled, enableDoubleTap, pendingGrid, onPutStone, boardSize],
  );

  const handlePressBackground = useCallback(() => {
    setPendingGrid((prev) => (prev !== null ? null : null));
  }, []);

  const currentMoveGrid = useMemo(() => {
    if (currentIndex === 0 || moveHistory.length === 0) return null;
    const move = moveHistory[currentIndex - 1];
    return move === PASS_GRID ? null : move;
  }, [currentIndex, moveHistory]);

  // 🐱 forceShowTerritoryがtrueなら、isGameEndedに関わらず地計算結果を表示する
  const showTerritory =
    forceShowTerritory ||
    (isGameEnded && currentIndex === boardHistory.length - 1);

  const pinSet = useMemo(() => new Set(pinPoints ?? []), [pinPoints]);

  const candidateSet = useMemo(
    () => new Set(candidatePoints),
    [candidatePoints],
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePressBackground}
        style={[
          styles.boardBase,
          {
            padding: paddingSize,
            borderRadius: radiusSize,
          },
        ]}
      >
        <View
          style={{
            position: "relative",
            width: innerWidth,
            height: innerWidth,
          }}
        >
          {/* ① 盤線 */}
          <BoardLines
            boardSize={boardSize}
            innerWidth={innerWidth}
            cellSize={cellSize}
            lineWidth={lineWidth}
          />

          {/* ② 各マス目 */}
          {board.map((goString, grid) => {
            const r = Math.floor(grid / boardSize);
            const c = grid % boardSize;

            return (
              <IntersectionContainer
                key={grid}
                grid={grid}
                boardSize={boardSize}
                cellSize={cellSize}
                stoneSize={stoneSize}
                goString={goString}
                territoryValue={territoryBoard?.[r]?.[c]}
                isPending={pendingGrid === grid}
                isCurrentMove={grid === currentMoveGrid}
                showTerritory={showTerritory}
                isPinned={pinSet.has(grid)}
                isEdited={editMarkers.get(grid) === "human"}
                isBotMove={editMarkers.get(grid) === "bot"}
                isCandidate={candidateSet.has(grid)}
                moveEvaluation={
                  grid === moveEvaluationPoint ? moveEvaluation : undefined
                }
                enableDoubleTap={enableDoubleTap}
                playerColor={playerColor}
                disabled={disabled}
                onPressGrid={handlePressGrid}
                prevTurn={prevTurn}
                lastMove={moveHistory[moveHistory.length-2]
                  // ⚠️ここがなんでlength-2なのかはよくわからんが、ともかくそうしたらうまくいった。
                }
              />
            );
          })}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  boardBase: {
    backgroundColor: COLORS.primary,
    position: "relative",
  },
});
