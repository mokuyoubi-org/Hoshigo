// RecordCard.tsx
import { COLORS } from "@/src/active/constants/colors";
import { RecordOrSkeleton } from "@/src/active/types/record";
import { isSkeletonCard } from "@/src/stable/logics/recordCardLogics";
import { GoBoard } from "go-components";
import {
  AgehamaCount,
  BLACK,
  Board,
  BoardSize,
  Grid,
  MatchType,
} from "go-core";
import React, { useState } from "react";
import { LayoutChangeEvent, TouchableOpacity, View } from "react-native";
import { RecordCardHeader } from "../common/RecordCardHeader";
import { SkeletonCard } from "./SkeletonCard";

export type Props = {
  record: RecordOrSkeleton;
  board: Board;
  territoryBoard: number[][] | undefined;
  matchType: MatchType;
  cardHeight: number;
  playerWin?: boolean;
  isPlayerBlack?: boolean;
  boardSize: BoardSize;
  onPress?: () => void;
  agehama: AgehamaCount;
};

// pb-4 相当(NativeWindのデフォルトscaleで 4 * 4px = 16px)
const BOTTOM_PADDING = 16;

export const RecordCard = ({
  record,
  board,
  territoryBoard,
  matchType,
  cardHeight,
  playerWin,
  isPlayerBlack,
  boardSize,
  onPress,
  agehama,
}: Props) => {
  const [cardWidth, setCardWidth] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const handleCardLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setCardWidth((prev) => (prev === width ? prev : width));
  };

  const handleHeaderLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setHeaderHeight((prev) => (prev === height ? prev : height));
  };

  if (isSkeletonCard(record) || !territoryBoard || !board) {
    return <SkeletonCard height={cardHeight} />;
  }

  // ヘッダーと下余白を引いた「碁盤に使える高さ」と、カード幅、どちらか小さい方に合わせる
  const availableHeight = cardHeight - headerHeight - BOTTOM_PADDING;
  const boardWidth = Math.max(0, Math.min(cardWidth, availableHeight)) * 0.96;

  const borderColor =
    playerWin === true
      ? COLORS.green
      : playerWin === false
        ? COLORS.coral
        : COLORS.backgroundDark;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLayout={handleCardLayout}
      className="justify-between items-center rounded-3xl overflow-hidden bg-foreground border-4 w-full"
      style={{ height: cardHeight, borderColor }}
    >
      <View onLayout={handleHeaderLayout} className="w-full">
        <RecordCardHeader
          record={record}
          isPlayerBlack={isPlayerBlack}
          playerWin={playerWin}
          isBlackPass={false}
          isWhitePass={false}
          currentAgehama={agehama}
          matchType={matchType}
          currentIndex={0}
          showWinRateBar={false} // これにより、レコードカードでは勝率バーを表示しない
        />
      </View>

      {boardWidth > 0 && (
        <View // 碁盤のタッチイベントを無効にする
          style={{ pointerEvents: "none" }}
        >
          <GoBoard
            // 盤面サイズ: 1
            boardSize={boardSize}
            // プレイヤの色: 1
            playerColor={BLACK} // ダミー
            // 現在の盤面、インデックス、テリトリーボード: 3
            board={board}
            territoryBoard={territoryBoard}
            currentIndex={0} // ダミー
            // history系: 3
            moveHistory={[]} // ダミー
            boardHistory={[board]}
            agehamaHistory={[]} // ダミー
            // タッチした時の処理: 1
            onPutStone={() => {}} // ダミー
            // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3
            disabled={true} // タッチ許可せず
            enableDoubleTap={false} // ダミー
            isGameEnded={true} // ダミー
            // その他情報: 5
            forceShowTerritory={true} // ダミーだけどちゃんとtrue
            editMarkers={new Map<Grid, "human" | "bot">()} // ダミー
            candidatePoints={[]} // ダミー
            moveEvaluationPoint={0} // ダミー
            moveEvaluation={undefined} // ダミー
            // 物理サイズ: 1
            boardWidth={boardWidth}
            // 色: 10
            boardColor={COLORS.primary}
            lineColor={COLORS.background}
            blackStoneColor={COLORS.darkObject}
            blackStoneAccentColor={COLORS.darkObjectAccent}
            whiteStoneColor={COLORS.lightObject}
            whiteStoneAccentColor={COLORS.lightObjectAccent}
            humanMoveColor={COLORS.humanMoveColor}
            botMoveColor={COLORS.botMoveColor}
            goodMoveColor={COLORS.goodMoveColor}
            badMoveColor={COLORS.badMoveColor}
          />
        </View>
      )}

      <View className="pb-4" />
    </TouchableOpacity>
  );
};
