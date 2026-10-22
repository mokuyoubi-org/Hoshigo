// IntersectionContainer.tsx

import { BLACK, Color, GoString, Grid, PASS_GRID } from "go-core";
import { memo } from "react";
import { ColorValue, Pressable, StyleSheet, View } from "react-native";
import { DoubleTapStone } from "./DoubleTapStone";
import { Marker } from "./Marker";
import { Stone } from "./Stone";

type Props = {
  grid: Grid;
  boardSize: number;
  cellSize: number;
  stoneSize: number;
  goString: GoString | null;
  ownership?: string; // この点の地の見込み(黒="B" / 白="W" / どちらでもない=".")

  isPending: boolean;
  isCurrentMove: boolean;
  showTerritory: boolean;
  isTerritoryEstimated?: boolean; // 🐱 陣地マーカーのopacityを半分にするかどうか(死に石マーカーには影響しない)
  isEdited?: boolean;
  isBotMove?: boolean;
  moveEvaluation?: "good" | "bad"; // 🐱 良手（○）・悪手（❌）の判定結果
  isCandidate?: boolean; // 🐱 候補手かどうか
  doubleTap: boolean;
  playerColor: Color;
  disabled: boolean;
  onPressGrid: (grid: Grid, goString: GoString | null) => void;
  lastMoverColor: Color; // 直前の手を打った側の色
  lastMove: Grid | undefined; // 直前の手(0手目なら undefined)
  blackStoneColor: ColorValue;
  whiteStoneColor: ColorValue;
  humanMoveColor: ColorValue;
  botMoveColor: ColorValue;
  goodMoveColor: ColorValue;
  badMoveColor: ColorValue;
  practiceMatchStatus: string;
};

export const IntersectionContainer = memo(
  ({
    grid,
    boardSize,
    cellSize,
    stoneSize,
    goString,
    ownership,
    isPending,
    isCurrentMove,
    showTerritory,
    isEdited,
    isBotMove,
    moveEvaluation,
    isCandidate,
    doubleTap,
    playerColor,
    disabled,
    onPressGrid,
    lastMoverColor,
    lastMove,
    blackStoneColor,
    whiteStoneColor,
    humanMoveColor,
    botMoveColor,
    goodMoveColor,
    badMoveColor,
    practiceMatchStatus,
  }: Props) => {
    const row = Math.floor(grid / boardSize);
    const col = grid % boardSize;
    // 死に石 = 石の色と、地の見込み(ownership)の符号が逆の石
    // (黒石なのに白地の見込み="W"、白石なのに黒地の見込み="B")
    const isDead =
      goString !== null &&
      ownership !== undefined &&
      ownership !== "." &&
      ownership !== (goString.color === BLACK ? "B" : "W");

    // 対局モード別に「この石に評価マーク(○/❌)を出してよいか」を判定
    // - human_human: 双方に見せる
    // - それ以外(bot参加あり)で bot_bot でなければ、自分の色の石にだけ見せる
    const isEvaluationEnabledForMode = (color: Color) =>
      practiceMatchStatus === "human_human" ||
      (practiceMatchStatus !== "bot_bot" && playerColor === color);

    // 実際に打たれた石に対する良手（○）・悪手（❌）の評価マークを出すか
    const isEvaluationMarkVisible =
      !!goString &&
      !!moveEvaluation &&
      isEvaluationEnabledForMode(goString.color);

    // 最新手マーカーを出すか（⭕️❌が出ているときは重複表示しない）
    const isLastMoveMarkerVisible =
      !!goString &&
      isCurrentMove &&
      !isEdited &&
      !isBotMove &&
      !isEvaluationMarkVisible;

    // 候補手（薄い石＋薄い○マーク）を出すか
    // 候補手は「直前に打たれた手の代わりの手」なので、
    // 直前に打ったのが自分の色の時だけ出す(相手の手の代わりは出さない)。
    // あと、直前がパスの時に候補手を出されるのも嫌なので、それも防止する。
    const isCandidateMoveVisible =
      (practiceMatchStatus === "human_human" ||
        (practiceMatchStatus !== "bot_bot" &&
          lastMoverColor === playerColor)) &&
      !goString &&
      isCandidate &&
      lastMove !== PASS_GRID;

    const pressableStyle = [
      styles.gridPressable,
      {
        left: col * cellSize - cellSize / 2 + 1,
        top: row * cellSize - cellSize / 2 + 1,
        width: cellSize,
        height: cellSize,
      },
    ];

    return (
      <Pressable
        onPress={() => onPressGrid(grid, goString)}
        style={pressableStyle}
        disabled={disabled}
      >
        {/* 石 */}
        {goString && (
          <Stone
            color={goString.color}
            stoneSize={stoneSize}
            opacity={isDead && showTerritory ? 0.48 : 1}
            blackStoneColor={blackStoneColor}
            whiteStoneColor={whiteStoneColor}
          />
        )}

        {/* ダブルタップ用のプレビュー石 */}
        {!goString && isPending && doubleTap && (
          <DoubleTapStone
            stoneSize={stoneSize}
            playerColor={playerColor}
            blackStoneColor={blackStoneColor}
            whiteStoneColor={whiteStoneColor}
          />
        )}

        {/* 最新手 */}
        {isLastMoveMarkerVisible && (
          <Marker
            size={stoneSize * 0.6}
            color={
              goString?.color === BLACK
                ? (whiteStoneColor as string) + "88"
                : (blackStoneColor as string) + "88"
            }
            shape="circle"
            opacity={!(isDead && showTerritory) ? 1 : 0.32}
            zIndex={5}
          />
        )}

        {/* 死んだ石 */}
        {goString && isDead && showTerritory && (
          <Marker
            size={stoneSize / 2}
            color={goString.color === BLACK ? whiteStoneColor : blackStoneColor}
            shape="square"
            opacity={0.32}
            zIndex={2}
          />
        )}

        {/* 陣地 */}
        {!goString && showTerritory && !!ownership && (
          <Marker
            size={stoneSize / 2}
            color={
              ownership === "B"
                ? blackStoneColor
                : ownership === "W"
                  ? whiteStoneColor
                  : "transparent"
            }
            shape="square"
            opacity={0.32}
            zIndex={1}
          />
        )}

        {/* 編集石（人間👦＝赤🟥） */}
        {isEdited && (
          <Marker
            size={stoneSize / 2}
            color={humanMoveColor}
            shape="square"
            opacity={!(isDead && showTerritory) ? 1 : 0.4}
            zIndex={10}
          />
        )}

        {/* ボットが打った石🤖=🟩 */}
        {isBotMove && (
          <Marker
            size={stoneSize / 2}
            color={botMoveColor}
            shape="square"
            opacity={!(isDead && showTerritory) ? 1 : 0.4}
            zIndex={10}
          />
        )}

        {/* 候補手 */}
        {isCandidateMoveVisible && (
          <View style={styles.candidateContainer}>
            {/* 薄い石(直前の手を打った側の色) */}
            <Stone
              color={lastMoverColor}
              stoneSize={stoneSize}
              opacity={0.6}
              blackStoneColor={blackStoneColor}
              whiteStoneColor={whiteStoneColor}
            />
            {/* 薄い良手（○）マーク。候補手に出すのは当然良手のみなので❌はない */}
            <Marker
              size={stoneSize * 0.7}
              color={goodMoveColor}
              shape="good"
              opacity={0.3}
              zIndex={15}
            />
          </View>
        )}

        {/* 実際に打たれた石に対する良手（○）・悪手（❌）の評価マーク */}
        {isEvaluationMarkVisible && (
          <Marker
            size={stoneSize * 0.7}
            shape={moveEvaluation}
            color={moveEvaluation === "good" ? goodMoveColor : badMoveColor}
            opacity={!(isDead && showTerritory) ? 0.6 : 0.3}
            zIndex={15}
          />
        )}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  gridPressable: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  candidateContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
