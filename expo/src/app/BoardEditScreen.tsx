import { RecordCardHeader } from "@/src/active/components/cards/records/RecordCardHeader";
import { useTranslation } from "@/src/active/language/i18n";
import { RecordType } from "@/src/active/types/record";
import {
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { GoBoard, ReplayControls, TerritoryBoard } from "expo-goband";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, SegmentedIconControl } from "ui-atoms";
import { TerritoryCalculatorButton } from "../active/components/buttons/TerritoryCalculatorButton";
import { ReplayTapOverlay } from "../active/components/go/ReplayTapOverlay";
import { COLORS } from "../active/constants/colors";
import { useProfile } from "../active/contexts/ProfileContexts";
import { useSuggestNextMove } from "../active/hooks/bot/useSuggestNextMove";
import { useTerritoryCalculation } from "../active/hooks/bot/useTerritoryCalculation";
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
    botMovePoints,
    handlePutStone,
    isBlackPass,
    isWhitePass,
    currentAgehama,
  } = useEditableGoBoard(record);

  // 🤖 ボット思考 & 🧮 地計算(どちらも編集モード専用の単発hook)
  const { suggestNextMove, isThinking } = useSuggestNextMove(
    boardSize,
    record.match_type,
  );
  const { calculateTerritory, isCalculating } = useTerritoryCalculation(
    boardSize,
    record.match_type,
  );

  // 🐱 地計算のその場限りの結果(保存はしない、画面を離れたら消えてOK)
  const [manualTerritory, setManualTerritory] = useState<{
    territoryBoard: TerritoryBoard;
    result: string;
  } | null>(null);

  // 🐱 局面が動いたら古い地計算結果は捨てる(そのままだと違う局面の結果が表示され続けてしまう)
  useEffect(() => {
    setManualTerritory(null);
  }, [currentIndex, isEditMode]);

  const handleBotSuggest = async () => {
    const grid = await suggestNextMove(
      processed.boardHistory[currentIndex],
      processed.moves.slice(0, currentIndex),
    );
    if (grid !== null) handlePutStone(grid, "bot");
  };

  const handleCalculateTerritory = async () => {
    const calculated = await calculateTerritory(
      processed.boardHistory[currentIndex],
      processed.moves.slice(0, currentIndex),
      currentAgehama.black,
      currentAgehama.white,
    );
    if (calculated) setManualTerritory(calculated);
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-[680px] mx-auto">
        {/* ヘッダー */}
        <View className="flex-row justify-between items-center px-5 py-3">
          <TouchableOpacity
            // ここが大事。対局画面には戻れないようにする
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/HomeScreen");
              }
            }}
            activeOpacity={0.7}
          >
            <Text className="text-base font-bold text-text tracking-wide">
              ‹ {t("common.back")}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-4">
            {isEditMode && (
              // ✏️編集モード: ボットが次の一手を考えてくれるボタン
              <IconButton
                icon={
                  isThinking ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <MaterialCommunityIcons name="robot" />
                  )
                }
                color={"#75b384d7"}
                onPress={handleBotSuggest}
              />
            )}

            {/* ✏️編集モード: 一体型になった地計算ボタンを使う */}
            {isEditMode && (
              <TerritoryCalculatorButton
                isCalculating={isCalculating}
                resultText={manualTerritory?.result}
                color={COLORS.primary}
                onPress={() => {
                  handleCalculateTerritory();
                }}
              />
            )}

            {/* {!isEditMode && (
              // 📕棋譜モード: ボットが分析をしてくれるボタン
              <IconButton
                icon={<Octicons name="graph" />}
                color={COLORS.primary}
                onPress={() => {}}
              />
            )} */}

            {/* 🔄 モード切り替えスイッチ（編集モード ↔ 閲覧・再現モード） */}
            <SegmentedIconControl
              value={isEditMode}
              onSelect={toggleEditMode}
              options={[
                {
                  value: false, // 閲覧モード（手）
                  icon: <FontAwesome6 name="book-open" />,
                  color: COLORS.primary,
                },
                {
                  value: true, // 編集モード（ペン）
                  icon: <MaterialIcons name="edit" />,
                  color: "#a45c5c7b",
                },
              ]}
            />
          </View>
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
                  onPutStone={(grid) => handlePutStone(grid, "human")}
                  moveHistory={processed.moves.slice(0, currentIndex + 1)}
                  territoryBoard={
                    manualTerritory?.territoryBoard ?? processed.territoryBoard
                  }
                  forceShowTerritory={!!manualTerritory}
                  disabled={!isEditMode}
                  isGameEnded={!isEditMode}
                  boardHistory={processed.boardHistory}
                  currentIndex={currentIndex}
                  editedPoints={editedPoints}
                  botMovePoints={botMovePoints}
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
