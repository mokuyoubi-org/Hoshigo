// GoBoard.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ColorValue, Pressable, StyleSheet, View } from "react-native";

import {
  AgehamaCount,
  BLACK,
  Board,
  BoardSize,
  Color,
  GoString,
  Grid,
  MatchType,
  PASS_GRID,
  WHITE,
} from "go-core";
import { useSounds } from "../hooks/useGoSounds";
import { BoardLines } from "./BoardLines";
import { IntersectionContainer } from "./stones/IntersectionContainer";
const EMPTY_EDIT_MARKERS = new Map<Grid, "human" | "bot">();

type Props = {
  // 盤面サイズ、マッチタイプ、プレイヤの色: 3
  boardSize: BoardSize;
  matchType: MatchType;
  playerColor: Color;
  // 現在の盤面、インデックス、テリトリーボード: 3
  board: Board;
  currentIndex: number;
  territoryBoard: number[][];
  // history系: 3
  moveHistory: Grid[];
  boardHistory: Board[];
  agehamaHistory: AgehamaCount[];
  // タッチした時の処理: 1
  onPutStone: (grid: Grid, boardSize: BoardSize) => void;
  // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3
  disabled: boolean;
  enableDoubleTap: boolean;
  isGameEnded: boolean;
  // その他情報: 5
  editMarkers: Map<Grid, "human" | "bot">;
  candidatePoints: Grid[]; // 直近の手が悪手だった場合に見せる、代替候補の位置一覧
  moveEvaluationPoint?: Grid | null; // 良手・悪手マークを付ける対象のマス(=直近に打たれた手) // 🔥これ多分要らない
  moveEvaluation: "good" | "bad" | undefined; // その手の評価 // 🔥というかここら辺もmapとか配列にするべきだろう
  forceShowTerritory: boolean; // isGameEndedに関わらず地計算結果を強制表示するフラグ
  // 物理サイズ: 1
  boardWidth: number;
  // 色: 10
  boardColor: ColorValue;
  lineColor: ColorValue;
  blackStoneColor: ColorValue;
  blackStoneAccentColor: ColorValue;
  whiteStoneColor: ColorValue;
  whiteStoneAccentColor: ColorValue;
  humanMoveColor: ColorValue;
  botMoveColor: ColorValue;
  goodMoveColor: ColorValue;
  badMoveColor: ColorValue;
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
  editMarkers = EMPTY_EDIT_MARKERS, // 🐱 誰がその地点を打ったか(人間/ボット)を表すMap
  candidatePoints = [],
  moveEvaluationPoint = null,
  moveEvaluation,
  forceShowTerritory = false,
  enableDoubleTap = false,
  playerColor = BLACK,
  boardColor,
  lineColor,
  blackStoneColor,
  blackStoneAccentColor,
  whiteStoneColor,
  whiteStoneAccentColor,
  humanMoveColor,
  botMoveColor,
  goodMoveColor,
  badMoveColor,
  matchType,
}: Props) {
  const [pendingGrid, setPendingGrid] = useState<Grid | null>(null);

  // レンダー中のState調整（React公式推奨パターン）
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  const [prevBoard, setPrevBoard] = useState(board);
  const currentTurn: Color = currentIndex % 2 === 0 ? BLACK : WHITE;

  if (prevIndex !== currentIndex || prevBoard !== board) {
    setPrevIndex(currentIndex);
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
            backgroundColor: boardColor,
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
            lineColor={lineColor}
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
                currentTurn={currentTurn}
                lastMove={
                  moveHistory[moveHistory.length - 2]
                  // ⚠️ここがなんでlength-2なのかはよくわからんが、ともかくそうしたらうまくいった。
                }
                blackStoneColor={blackStoneColor}
                blackStoneAccentColor={blackStoneAccentColor}
                whiteStoneColor={whiteStoneColor}
                whiteStoneAccentColor={whiteStoneAccentColor}
                humanMoveColor={humanMoveColor}
                botMoveColor={botMoveColor}
                goodMoveColor={goodMoveColor}
                badMoveColor={badMoveColor}
                matchType={matchType}
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
    position: "relative",
  },
});
