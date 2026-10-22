// expo/packages/go-components/src/components/goBoard/GoBoard.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColorValue, Pressable, StyleSheet, View } from "react-native";

import {
  AgehamaCount,
  BLACK,
  Board,
  BoardSize,
  Color,
  getColorToMove,
  getOppositeColor,
  GoString,
  Grid,
  MatchType,
  Ownership,
  PASS_GRID,
} from "go-core";
import { useGoSounds } from "../../hooks/useGoSounds";
import { IntersectionContainer } from "../stones/IntersectionContainer";
import { BoardLines } from "./BoardLines";

// 省略された時に使う空っぽの値。毎回新しく作らないよう、ここで1つだけ作っておく
const EMPTY_EDIT_MARKERS = new Map<Grid, "human" | "bot">();
const EMPTY_GRIDS: Grid[] = [];

type Props = {
  // 盤面サイズ、マッチタイプ、プレイヤの色: 3
  boardSize: BoardSize;
  matchType: MatchType;
  playerColor?: Color; // 省略時は黒
  // 現在の盤面、インデックス、地の見込み(ownership): 3
  board: Board;
  currentIndex: number;
  ownership?: Ownership | null; // 各マスの地の見込み(黒="B" / 白="W" / どちらでもない=".")。地を出さないときは null か省略
  // history系: 3
  moveHistory?: Grid[]; // currentIndex 手目までの手。それより先の手が入っていてもよい
  boardHistory: Board[];
  agehamaHistory?: AgehamaCount[]; // 今は使っていない(全ての呼び出し元から外せたら、ここも消せる)
  // タッチした時の処理: 1
  onPutStone: (grid: Grid, boardSize: BoardSize) => void;
  // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3(省略時はすべて false)
  disabled?: boolean;
  doubleTap?: boolean;
  isGameEnded?: boolean;
  // その他情報: 5
  editMarkers?: Map<Grid, "human" | "bot">;
  candidatePoints?: Grid[]; // 直近の手が悪手だった場合に見せる、代替候補の位置一覧
  moveEvaluationPoint?: Grid | null; // 良手・悪手マークを付ける対象のマス(=直近に打たれた手) // 🔥これ多分要らない
  moveEvaluation?: "good" | "bad"; // その手の評価 // 🔥というかここら辺もmapとか配列にするべきだろう
  forceShowTerritory?: boolean; // isGameEndedに関わらず地計算結果を強制表示するフラグ
  // 物理サイズ: 1
  boardWidth: number;
  // 色: 10
  boardColor: ColorValue;
  lineColor: ColorValue;
  blackStoneColor: ColorValue;
  whiteStoneColor: ColorValue;
  humanMoveColor: ColorValue;
  botMoveColor: ColorValue;
  goodMoveColor: ColorValue;
  badMoveColor: ColorValue;
  //
  sound?: boolean; // 省略時は false
  practiceMatchStatus: string;
};

export const GoBoard = ({
  boardSize,
  board,
  onPutStone,
  moveHistory = EMPTY_GRIDS,
  ownership,
  disabled = false,
  isGameEnded = false,
  boardHistory,
  currentIndex,
  boardWidth,
  editMarkers = EMPTY_EDIT_MARKERS, // 🐱 誰がその地点を打ったか(人間/ボット)を表すMap
  candidatePoints = EMPTY_GRIDS,
  moveEvaluationPoint = null,
  moveEvaluation,
  forceShowTerritory = false,
  doubleTap = false,
  playerColor = BLACK,
  boardColor,
  lineColor,
  blackStoneColor,
  whiteStoneColor,
  humanMoveColor,
  botMoveColor,
  goodMoveColor,
  badMoveColor,
  matchType,
  sound = false,
  practiceMatchStatus,
}: Props) => {
  const [pendingGrid, setPendingGrid] = useState<Grid | null>(null);

  // レンダー中のState調整（React公式推奨パターン）
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  const [prevBoard, setPrevBoard] = useState(board);

  if (prevIndex !== currentIndex || prevBoard !== board) {
    setPrevIndex(currentIndex);
    setPrevBoard(board);
    setPendingGrid(null);
  }

  // 🌟 今見ている局面は「currentIndex 手打った後」の局面。
  //   だから直前の手は moveHistory[currentIndex - 1](0手目なら undefined)。
  //   moveHistory にそれより先の手が入っていても、ずれない。
  const lastMove: Grid | undefined = moveHistory[currentIndex - 1];
  // その手を打った側の色。置き碁(白から打ち始める)でも、getColorToMove が正しく数えてくれる。
  const lastMoverColor = getOppositeColor(
    getColorToMove(matchType, currentIndex),
  );

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

  const { playSound } = useGoSounds();

  useEffect(() => {
    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    // 🛡️ガード
    if (prevIdx === null || currentIndex !== prevIdx + 1) return;

    const appliedMove = moveHistory[currentIndex - 1];

    // パスのときはパスの音、石を置いたときは石の音を鳴らす
    if (sound) {
      if (appliedMove === PASS_GRID) {
        playSound("pass", 0.1);
      } else {
        playSound("stone");
      }
    }
  }, [currentIndex, moveHistory, playSound, sound]);

  const handlePressGrid = useCallback(
    (grid: Grid, goString: GoString | null) => {
      // 🛡️ガード
      if (disabled) return;

      if (goString) {
        setPendingGrid(null);
        return;
      }

      if (!doubleTap || pendingGrid === grid) {
        onPutStone(grid, boardSize);
        setPendingGrid(null);
      } else {
        setPendingGrid(grid);
      }
    },
    [disabled, doubleTap, pendingGrid, onPutStone, boardSize],
  );

  // 盤の背景をタップしたら、ダブルタップの「仮置き」を取り消す
  const handlePressBackground = () => setPendingGrid(null);

  // 直前の手の位置(パスなら出さない)
  const currentMoveGrid =
    lastMove === undefined || lastMove === PASS_GRID ? null : lastMove;

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
          {board.map((goString, grid) => (
            <IntersectionContainer
              key={grid}
              grid={grid}
              boardSize={boardSize}
              cellSize={cellSize}
              stoneSize={stoneSize}
              goString={goString}
              ownership={ownership?.[grid]}
              isPending={pendingGrid === grid}
              isCurrentMove={grid === currentMoveGrid}
              showTerritory={showTerritory}
              isEdited={editMarkers.get(grid) === "human"}
              isBotMove={editMarkers.get(grid) === "bot"}
              isCandidate={candidateSet.has(grid)}
              moveEvaluation={
                grid === moveEvaluationPoint ? moveEvaluation : undefined
              }
              doubleTap={doubleTap}
              playerColor={playerColor}
              disabled={disabled}
              onPressGrid={handlePressGrid}
              lastMoverColor={lastMoverColor}
              lastMove={lastMove}
              blackStoneColor={blackStoneColor}
              whiteStoneColor={whiteStoneColor}
              humanMoveColor={humanMoveColor}
              botMoveColor={botMoveColor}
              goodMoveColor={goodMoveColor}
              badMoveColor={badMoveColor}
              practiceMatchStatus={practiceMatchStatus}
            />
          ))}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  boardBase: {
    position: "relative",
  },
});
