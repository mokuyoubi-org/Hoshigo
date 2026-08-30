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
import { BoardGridCell } from "./BoardGridCell";
import { BoardLines } from "./BoardLines";

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

  // 🐱 サイズ計算を useMemo でキャッシュ！(boardWidth や boardSize が変わらない限り再計算しない)
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

  useEffect(() => {
    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    if (prevIdx === null) return;
    if (currentIndex !== prevIdx + 1) return;

    const appliedMove = moveHistory[currentIndex - 1];
    if (appliedMove === PASS_GRID) return;

    stonePlayer.seekTo(0);
    stonePlayer.play();
  }, [currentIndex, moveHistory]);

  // 🐱 タップ処理を useCallback で固定（毎回新しく作られないようにする）
  const handlePressGrid = useCallback(
    (grid: Grid, goString: GoString | null) => {
      if (disabled) return; // 🐱 自分の番じゃないならタップ全般を無視！

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

  // 直近の手（着手マーク用）の計算も固定する
  const currentMoveGrid = useMemo(() => {
    if (currentIndex === 0 || moveHistory.length === 0) return null;
    const move = moveHistory[currentIndex - 1];
    return move === PASS_GRID ? null : move;
  }, [currentIndex, moveHistory]);

  const showTerritory = isGameEnded && currentIndex === boardHistory.length - 1;

  // 🐱 ピンポイントの検索を Set にして高速化！(O(1)で検索できる)
  const pinSet = useMemo(() => new Set(pinPoints ?? []), [pinPoints]);

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
          {/* ① 盤線 (Memo化済み) */}
          <BoardLines
            boardSize={boardSize}
            innerWidth={innerWidth}
            cellSize={cellSize}
            lineWidth={lineWidth}
          />

          {/* ② 各マス目 (Memo化済み) */}
          {board.map((goString, grid) => {
            const r = Math.floor(grid / boardSize);
            const c = grid % boardSize;

            return (
              <BoardGridCell
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
