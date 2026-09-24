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
  WHITE,
} from "go-core";
import React, { useState } from "react";
import { LayoutChangeEvent, TouchableOpacity, View } from "react-native";
import { useProfile } from "../../contexts/ProfileContexts";
// ★ HeaderPlayerInfo を import に追加した
import { HeaderPlayerInfo, RecordCardHeader } from "../common/RecordCardHeader";
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

  const { iconIndex, username } = useProfile();

  // ★ : HeaderPlayerInfo を指定して型をはっきりさせた
  const leftPlayer: HeaderPlayerInfo = {
    username: username ?? "user",
    rankIndex: isPlayerBlack
      ? record.black_rank_index
      : record.white_rank_index,
    iconIndex: iconIndex ?? 0,
    color: isPlayerBlack ? BLACK : WHITE,
    agehama: isPlayerBlack ? agehama.black : agehama.white,
    showPass: false,
  };

  // ★ こちらも同様に指定した
  const rightPlayer: HeaderPlayerInfo = {
    username: isPlayerBlack ? record.white_username : record.black_username,
    rankIndex: isPlayerBlack
      ? record.white_rank_index
      : record.black_rank_index,
    iconIndex: isPlayerBlack
      ? record.white_icon_index
      : record.black_icon_index,
    color: isPlayerBlack ? WHITE : BLACK,
    agehama: isPlayerBlack ? agehama.white : agehama.black,
    showPass: false,
  };

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
          leftPlayer={leftPlayer}
          rightPlayer={rightPlayer}
          playerWin={playerWin}
          matchType={matchType}
          currentIndex={0}
          showWinRateBar={false}
        />
      </View>

      {boardWidth > 0 && (
        <View // 碁盤のタッチイベントを無効にする
          style={{ pointerEvents: "none" }}
        >
          <GoBoard
            // 盤面サイズ: 1
            boardSize={boardSize}
            matchType={matchType}
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
            doubleTap={false} // ダミー
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
            // 音
            sound={false}
            practiceMatchStatus={""} // 適当
          />
        </View>
      )}

      <View className="pb-4" />
    </TouchableOpacity>
  );
};
