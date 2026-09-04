// BoardEditScreen.tsx
import { RecordCardHeader } from "@/src/active/components/cards/records/RecordCardHeader";
import { useTranslation } from "@/src/active/language/i18n";
import { RecordType } from "@/src/active/types/record";
import {
  BoardSize,
  generateTerritoryBoard,
  GoBoard,
  Grid,
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
import { ReplayTapOverlay } from "../active/components/go/ReplayTapOverlay";
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

  return <BoardEditScreenContent record={record} />;
}

function BoardEditScreenContent({ record }: { record: RecordType }) {
  const t = useTranslation();
  const { uid } = useProfile();
  const boardSize = record.board_size as BoardSize;

  // 編集モードState & 着手配列
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableMoves, setEditableMoves] = useState<Grid[]>(
    record.moves ?? [],
  );

  // 🐱 リプレイモードで見ていたインデックスを記憶しておくためのState！
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  // 盤面データ計算
  const processed = useMemo(() => {
    const deadStones = record.dead_stones;

    const { boardHistory, agehamaHistory } = movesToBoardHistory(
      boardSize,
      record.match_type,
      editableMoves,
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
      moves: editableMoves,
      agehamaHistory,
      territoryBoard,
    };
  }, [boardSize, record.match_type, record.dead_stones, editableMoves]);

  const maxIdx = Math.max(0, processed.boardHistory.length - 1);
  const [currentIndex, setCurrentIndex] = useState(maxIdx);

  // ──────────────────────────────────────────────

  // 🐱 現在表示されている盤面の石が「分岐点以降に打たれた石か」を正しく判定するにゃ！
  const editedPoints = useMemo(() => {
    if (!isEditMode) return [];

    const originalMoves = record.moves ?? [];
    const currentBoard = processed.boardHistory[currentIndex] ?? [];

    // ① 元の棋譜から枝分かれ（分岐）した最初のインデックスを探すにゃ
    let branchIndex = -1;
    const maxLen = Math.max(originalMoves.length, editableMoves.length);
    for (let i = 0; i < maxLen; i++) {
      if (originalMoves[i] !== editableMoves[i]) {
        branchIndex = i;
        break;
      }
    }

    // 1手も分岐していない場合はハイライトなし
    if (branchIndex === -1) return [];

    // ② 「現在表示されている手数（currentIndex）」までに打たれた編集手（branchIndex以降）を Set に入れるにゃ
    // ※ currentIndex 手目までに打たれた手は index が 0 〜 (currentIndex - 1) だにゃ！
    const editedMovesSet = new Set<Grid>();
    for (let i = branchIndex; i < currentIndex; i++) {
      const move = editableMoves[i];
      if (move !== undefined && move !== PASS_GRID) {
        editedMovesSet.add(move);
      }
    }

    const edited: Grid[] = [];

    // ③ 現在の盤面上に存在する石（goString）のうち、editedMovesSet に含まれるマスだけを抽出するにゃ！
    currentBoard.forEach((goString, grid) => {
      if (goString && editedMovesSet.has(grid)) {
        edited.push(grid);
      }
    });

    return edited;
  }, [
    record.moves,
    editableMoves,
    isEditMode,
    processed.boardHistory,
    currentIndex,
  ]);

  // 🐱 編集モード切替のロジックを修正！
  const toggleEditMode = () => {
    if (!isEditMode) {
      // 【リプレイ ➔ 編集モードへ行く時】
      // 現在のインデックスを保存してから編集モードを開始！
      setSavedIndex(currentIndex);
      setIsEditMode(true);
    } else {
      // 【編集 ➔ リプレイモードに戻る時】
      // 編集内容を全部捨てて元の棋譜にリセット！
      setEditableMoves(record.moves ?? []);
      // 覚えておいた元のインデックスに戻す！
      if (savedIndex !== null) {
        setCurrentIndex(savedIndex);
        setSavedIndex(null);
      }
      setIsEditMode(false);
    }
  };

  // 編集モードでの着手
  const handlePutStone = (grid: Grid) => {
    if (!isEditMode) return;
    const newMoves = [...editableMoves.slice(0, currentIndex), grid];
    setEditableMoves(newMoves);
    setCurrentIndex(currentIndex + 1);
  };

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

  // 碁盤エリアのサイズ測定
  const [boardAreaSize, setBoardAreaSize] = useState({ width: 0, height: 0 });

  const handleBoardAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardAreaSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

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
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-[680px] mx-auto">
        {/* ヘッダー */}
        <View className="flex-row justify-between items-center px-5 py-3">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-base font-bold text-text tracking-wide">
              ‹ {t("common.back")}
            </Text>
          </TouchableOpacity>

          {/* 碁盤の右上端に重ねた編集モード切り替えボタン */}
          {/* <TouchableOpacity
            onPress={toggleEditMode}
            activeOpacity={0.8}
            className={`px-2 py-2 rounded-full border-4 border-primaryDark ${
              !isEditMode ? "bg-primaryLight" : "bg-background"
            }`}
          >
            <Text className="text-base font-bold text-primaryDark tracking-wide">
              {!isEditMode ?t("common.edit"):t("common.done")}
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* コンテンツ領域 */}
        <View className="flex-1 px-4 pb-6">
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

          {/* 碁盤エリア */}
          <View
            className="flex-1 w-full justify-center items-center"
            onLayout={handleBoardAreaLayout}
          >
            {boardWidth > 0 && (
              <View
                style={{
                  width: boardWidth,
                  height: boardWidth,
                  position: "relative",
                }}
              >
                <GoBoard
                  boardSize={boardSize}
                  boardWidth={boardWidth}
                  agehamaHistory={processed.agehamaHistory}
                  board={
                    processed.boardHistory[currentIndex] ??
                    processed.boardHistory[0] ??
                    {}
                  }
                  onPutStone={handlePutStone}
                  moveHistory={processed.moves.slice(0, currentIndex + 1)}
                  territoryBoard={processed.territoryBoard}
                  disabled={!isEditMode}
                  isGameEnded={!isEditMode}
                  boardHistory={processed.boardHistory}
                  currentIndex={currentIndex}
                  onCurrentIndexChange={setCurrentIndex}
                  editedPoints={editedPoints}
                />

                {/* リプレイ時のみタップオーバーレイを重ねる */}
                {!isEditMode && (
                  <ReplayTapOverlay
                    currentIndex={currentIndex}
                    maxIndex={maxIdx}
                    onCurrentIndexChange={setCurrentIndex}
                  />
                )}
              </View>
            )}
          </View>

          <ReplayControls
            onCurrentIndexChange={setCurrentIndex}
            currentIndex={currentIndex}
            maxIndex={maxIdx}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
