import { RecordCardHeader } from "@/src/active/components/cards/records/RecordCardHeader";
import { useTranslation } from "@/src/active/language/i18n";
import { RecordType } from "@/src/active/types/record";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { GoBoard, ReplayControls } from "expo-goband";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "ui-atoms";
import { ReplayTapOverlay } from "../active/components/go/ReplayTapOverlay";
import { COLORS } from "../active/constants/colors";
import { useProfile } from "../active/contexts/ProfileContexts";
import { useEditableGoBoard } from "../active/hooks/screens/useEditableGoBoard";

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

  const {
    boardSize,
    isEditMode,
    toggleEditMode,
    currentIndex,
    setCurrentIndex,
    maxIdx,
    processed,
    editedPoints,
    handlePutStone,
    isBlackPass,
    isWhitePass,
    currentAgehama,
  } = useEditableGoBoard(record);

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

          <IconButton
            icon={
              !isEditMode ? (
                <MaterialIcons name="edit" />
              ) : (
                <FontAwesome6 name="hand" />
              )
            }
            color={COLORS.primary}
            onPress={toggleEditMode}
          />
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
                  editedPoints={editedPoints}
                />

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
