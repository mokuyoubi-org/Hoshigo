// RecordCard.tsx
import { COLORS } from "@/src/active/constants/colors";
import { RecordOrSkeleton } from "@/src/active/types/record";
import { isSkeletonCard } from "@/src/stable/logics/recordCardLogics";
import { Agehama, Board, BoardSize, GoBoard, MatchType } from "expo-goband";
import React, { useState } from "react";
import { LayoutChangeEvent, TouchableOpacity, View } from "react-native";
import { SkeletonCard } from "../SkeletonCard";
import { RecordCardHeader } from "./RecordCardHeader";

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
  agehama: Agehama;
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
        />
      </View>

      {boardWidth > 0 && (
        <View
          pointerEvents="none" /*これで碁盤のタッチイベントが無効になる！ */
        >
          <GoBoard
            boardSize={boardSize}
            boardWidth={boardWidth}
            board={board}
            onPutStone={() => {}}
            moveHistory={[]}
            territoryBoard={territoryBoard}
            disabled={true}
            isGameEnded={true}
            boardHistory={[board]}
            currentIndex={0}
            agehamaHistory={[]}
          />
        </View>
      )}

      <View className="pb-4" />
    </TouchableOpacity>
  );
};
