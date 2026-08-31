// BoardEditScreen.tsx
import { RecordCardHeader } from "@/src/active/components/cards/records/RecordCardHeader";
import { useTranslation } from "@/src/active/language/i18n";
import { RecordType } from "@/src/active/types/record";
import {
  BoardSize,
  generateTerritoryBoard,
  GoBoard,
  isNoOkiishi,
  movesToBoardHistory,
  PASS_GRID,
  ReplayControls,
} from "expo-goband";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "../active/contexts/ProfileContexts";

export default function BoardEditScreen() {
  const { recordJson } = useLocalSearchParams<{ recordJson: string }>();

  const record = useMemo<RecordType | null>(() => {
    if (!recordJson) return null;
    try {
      return JSON.parse(recordJson) as RecordType;
    } catch (e) {
      console.error("Failed to parse recordJson:", e);
      return null;
    }
  }, [recordJson]);

  if (!record) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <Text className="text-text">Loading...</Text>
      </SafeAreaView>
    );
  }

  return <AnalyzeScreenContent record={record} />;
}

function AnalyzeScreenContent({ record }: { record: RecordType }) {
  const t = useTranslation();
  const { uid } = useProfile();

  const processed = useMemo(() => {
    const boardSize = record.board_size as BoardSize;
    const moves = record.moves ?? [];
    const deadStones = record.dead_stones;

    const { boardHistory, agehamaHistory } = movesToBoardHistory(
      boardSize,
      record.match_type,
      moves,
    );

    const territoryBoard = deadStones
      ? generateTerritoryBoard(
          boardSize,
          boardHistory.at(-1)!,
          deadStones,
          record.match_type,
          0,
          0,
        ).territoryBoard
      : Array.from({ length: boardSize }, () => Array(boardSize).fill(0));

    return {
      boardHistory,
      moves,
      agehamaHistory,
      territoryBoard,
    };
  }, [record]);

  const isPlayerBlack = record.black_uid === uid;
  const blackWins = record.result?.startsWith("B")
    ? true
    : record.result?.startsWith("W")
      ? false
      : undefined;
  const playerWin =
    blackWins === undefined
      ? undefined
      : isPlayerBlack
        ? blackWins
        : !blackWins;

  const maxIdx = Math.max(0, processed.boardHistory.length - 1);
  const [currentIndex, setCurrentIndex] = useState(maxIdx);

  const boardSize = record.board_size as BoardSize;

  // 🐱 碁盤エリア(ヘッダーとリプレイコントロールの間)の実測サイズにするにゃん！
  const [boardAreaSize, setBoardAreaSize] = useState({ width: 0, height: 0 });

  const handleBoardAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardAreaSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  // 縦・横どちらか小さい方に合わせて、目一杯大きく・はみ出さないサイズにする
  const boardWidth =
    Math.max(0, Math.min(boardAreaSize.width, boardAreaSize.height)) * 0.96;

  const moveHistory = processed.moves.slice(0, currentIndex + 1);
  const isCurrentMovePass = moveHistory[currentIndex - 1] === PASS_GRID;
  const isNormalOrder = isNoOkiishi(record.match_type);
  const lastMoveWasBlack = isNormalOrder
    ? currentIndex % 2 === 1
    : currentIndex % 2 === 0;

  const isBlackPass = isCurrentMovePass && lastMoveWasBlack;
  const isWhitePass = isCurrentMovePass && !lastMoveWasBlack;
  const currentAgehama = processed.agehamaHistory[currentIndex] ?? {
    black: 0,
    white: 0,
  };

  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <StatusBar style="dark" />

      {/* 🐱 外枠に max-w-[680px] w-full を指定して中央寄せにするにゃん！ */}
      <View className="flex-1 w-full max-w-[680px] px-4 pb-6">
        {/* ヘッダ */}
        <View className="flex-row items-center py-3">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-base font-bold text-text">
              ‹ {t("common.back")}
            </Text>
          </TouchableOpacity>
          <View className="w-10" />
        </View>

        <RecordCardHeader
          record={record}
          isPlayerBlack={isPlayerBlack}
          playerWin={playerWin}
          isBlackPass={isBlackPass}
          isWhitePass={isWhitePass}
          currentAgehama={currentAgehama}
          simpleComment={false}
          matchType={record.match_type}
        />

        {/* 🐱 碁盤エリア: items-centerを付けず、w-fullでストレッチさせたまま高さだけ実測するにゃん！ */}
        <View
          className="flex-1 w-full justify-center items-center"
          onLayout={handleBoardAreaLayout}
        >
          {boardWidth > 0 && (
            <GoBoard
              boardSize={boardSize}
              boardWidth={boardWidth}
              agehamaHistory={processed.agehamaHistory}
              board={
                processed.boardHistory[currentIndex] ??
                processed.boardHistory[0] ??
                {}
              }
              onPutStone={() => {}}
              moveHistory={moveHistory}
              territoryBoard={processed.territoryBoard}
              disabled={true}
              isGameEnded={true}
              boardHistory={processed.boardHistory}
              currentIndex={currentIndex}
              onCurrentIndexChange={setCurrentIndex}
            />
          )}
        </View>

        <ReplayControls
          onCurrentIndexChange={setCurrentIndex}
          currentIndex={currentIndex}
          maxIndex={maxIdx}
        />
      </View>
    </SafeAreaView>
  );
}
