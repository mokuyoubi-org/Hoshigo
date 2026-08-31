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
import { ReplayTapOverlay } from "./ReplayTapOverlay";

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
  onCurrentIndexChange?: (index: number) => void; // 🐱 ① インデックス変更用のコールバックを追加！
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
  onCurrentIndexChange, // 🐱 受け取るにゃん！
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
      // プレイヤーが存在して、再生準備が整っているかチェック
      if (!stonePlayer) return;

      // seekTo や play は Promise を返すので await で安全に待つ
      await stonePlayer.seekTo(0);
      await stonePlayer.play();
    } catch (error) {
      // ネイティブ側で再生エラーが起きてもアプリを落とさないようにキャッチする
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

    // 🐱 安全な再生関数を呼び出す
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

  // 🐱 最大手数（リプレイの最大インデックス）を算出
  const maxIndex = useMemo(() => {
    return Math.max(0, (boardHistory?.length ?? 1) - 1);
  }, [boardHistory]);

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

          {/* 🐱 ③ disabled の時だけ、マス目の上に透明なタップエリアを重ねる！ */}
          {disabled && (
            <ReplayTapOverlay
              currentIndex={currentIndex}
              maxIndex={maxIndex}
              onCurrentIndexChange={onCurrentIndexChange}
            />
          )}
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
