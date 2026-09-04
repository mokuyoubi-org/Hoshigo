// GoBoard.tsx

import { useAudioPlayer } from "expo-audio";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { COLORS } from "../constants/colors";
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
import { DecoratedStone } from "./stones/DecoratedStone";

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
  editedPoints?: Grid[]; // 🐱 編集された石の位置リストを追加！
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
  editedPoints = [],
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

  // 🐱 サイズ計算
  const {
    innerWidth,
    cellSize,
    stoneSize,
    lineWidth,
    paddingSize,
    radiusSize,
  } = useMemo(() => {
    const paddingRatio = 0.8;
    const innerWidthCalc =
      boardWidth / (1 + (2 * paddingRatio) / (boardSize - 1));
    const cellSizeCalc = innerWidthCalc / (boardSize - 1);
    return {
      innerWidth: innerWidthCalc,
      cellSize: cellSizeCalc,
      stoneSize: cellSizeCalc * 0.9,
      lineWidth: Math.max(1, innerWidthCalc / 200),
      paddingSize: cellSizeCalc * paddingRatio,
      radiusSize: boardWidth * 0.06,
    };
  }, [boardWidth, boardSize]);

  // ─── 音 ──────────────────────────────────────────────
  const stonePlayer = useAudioPlayer(require("../../assets/sounds/stone.mp3"));
  const prevIndexRef = useRef<number | null>(null);

  // 🐱 音声を安全に鳴らすためのヘルパー関数
  const playStoneSound = useCallback(async () => {
    try {
      if (!stonePlayer) return;

      await stonePlayer.seekTo(0);
      await stonePlayer.play();
    } catch (error) {
      console.warn("Failed to play stone sound:", error);
    }
  }, [stonePlayer]);

  useEffect(() => {
    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    if (prevIdx === null) return;
    if (currentIndex !== prevIdx + 1) return;

    const appliedMove = moveHistory[currentIndex - 1];
    if (appliedMove === PASS_GRID) return;

    playStoneSound();
  }, [currentIndex, moveHistory, playStoneSound]);

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

  const showTerritory = isGameEnded && currentIndex === boardHistory.length - 1;

  const pinSet = useMemo(() => new Set(pinPoints ?? []), [pinPoints]);

  // 🐱 判定を高速化するために Set に変換する
  const editedSet = useMemo(() => new Set(editedPoints), [editedPoints]);

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
              <DecoratedStone
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
                isEdited={editedSet.has(grid)} // 🐱 ここで BoardGridCell に渡すにゃ！
                enableDoubleTap={enableDoubleTap}
                playerColor={playerColor}
                disabled={disabled}
                onPressGrid={handlePressGrid}
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
