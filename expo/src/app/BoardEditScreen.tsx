// app/BoardEditScreen.tsx
import { GoBoard, ScoreLeadReplayControls } from "@/packages/go-components/src";
import { BLACK, WHITE } from "@/packages/go-core/src";
import { IconButton, SegmentedIconControl } from "@/packages/ui-atoms/src";
import { RecordCardHeader } from "@/src/active/components/common/RecordCardHeader";
import { useTranslation } from "@/src/active/i18n";
import { RecordType } from "@/src/active/types/record";
import {
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ReplayTapOverlay } from "go-components";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TerritoryCalculatorButton } from "../active/components/buttons/TerritoryCalculatorButton";
import { COLORS } from "../active/constants/colors";
import { useProfile } from "../active/contexts/ProfileContexts";
import { useBotAnalysis } from "../active/hooks/bot/useBotAnalysis";
import { useBoardEditActions } from "../active/hooks/edit/useBoardEditActions";
import { useEditableGoBoard } from "../active/hooks/edit/useEditableGoBoard";
import { useReplayMoveEvaluation } from "../active/hooks/edit/useReplayMoveEvaluation";
import { useDoubleTapSetting } from "../active/hooks/screens/useDoubleTapSetting";

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

  // 🐱 棋譜モード専用：手ごとのKataGo解析を進める・止める・DBに永続化する
  const botAnalysis = useBotAnalysis(record);

  // 🐱 「完全に分析済みか」は手ごとの解析(analyzedCount)に加えて、最後の1手の
  //    効果を測るための最終局面(perMove[totalMoves])まで埋まっているかも見る
  const isFullyAnalyzed =
    botAnalysis.analyzedCount >= botAnalysis.totalMoves &&
    botAnalysis.analysis.perMove[botAnalysis.totalMoves] != null;

  // 🐱 botAnalysisが進めた解析結果を反映させたrecord。編集モードの分析キャッシュも
  //    リプレイモードの好手/悪手判定も、どちらもこちらを見るようにする
  const liveRecord = useMemo(
    () => ({ ...record, analysis: botAnalysis.analysis }),
    [record, botAnalysis.analysis],
  );

  // 🐱 編集モード・盤面履歴・分析キャッシュはすべてここに集約されている
  const board = useEditableGoBoard(liveRecord);

  const { enableDoubleTap13 } = useDoubleTapSetting();

  // 🐱 ボット思考・地計算ボタンの処理と、地計算の一時表示状態
  const {
    manualTerritory,
    handleBotSuggest,
    handleCalculateTerritory,
    isBotSuggesting,
    isCalculatingTerritory,
    isAnyProcessing,
  } = useBoardEditActions(board, board.boardSize, record.match_type);

  // 🐱 リプレイモードでの好手・悪手判定と代替候補手
  const { lastMoveEvaluation, lastMoveGrid, candidatePoints } =
    useReplayMoveEvaluation(
      liveRecord,
      board.boardSize,
      board.currentIndex,
      board.isEditMode,
    );

  // 🐱 RecordCardHeaderは`record`ごと受け取って中でrecord.analysisを見るので、
  //    分岐後の合成データに差し替えたrecordを作って渡す。
  const recordForHeader = useMemo(
    () => ({ ...record, analysis: board.combinedAnalysis }),
    [record, board.combinedAnalysis],
  );

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
              // 🐱 分析ループが裏で走ったままナビゲーションするのを防ぐ
              if (botAnalysis.isAnalyzing) botAnalysis.requestStop();
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
            {!board.isEditMode && !isFullyAnalyzed && (
              // 📕棋譜モード: もし盤面がまだ分析されてなかったら分析するボタン。
              //    分析済みなら表示しない。押すと未分析の続きから再開する。
              <IconButton
                icon={
                  botAnalysis.isAnalyzing ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Octicons name="graph" />
                  )
                }
                color={COLORS.primary}
                onPress={botAnalysis.toggleAnalysis}
              />
            )}

            {board.isEditMode && (
              // ✏️編集モード: auto on offボタン
              <IconButton
                icon={
                  <MaterialCommunityIcons
                    name={board.isAutoAnalysisEnabled ? "flash" : "flash-off"}
                  />
                }
                color={board.isAutoAnalysisEnabled ? COLORS.primary : "#9999"}
                onPress={board.toggleAutoAnalysis}
              />
            )}

            {board.isEditMode && (
              // ✏️編集モード: ボットが次の一手を考えてくれるボタン
              <IconButton
                icon={
                  isBotSuggesting ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <MaterialCommunityIcons name="robot" />
                  )
                }
                color={"#75b384d7"}
                onPress={handleBotSuggest}
                disabled={isAnyProcessing}
                // 🐱 自分が実行中ではなく、他の処理が動いて押せない時は薄く(opacity: 0.4)する
                style={{
                  opacity: isAnyProcessing && !isBotSuggesting ? 0.4 : 1,
                }}
              />
            )}

            {/* ✏️編集モード: 一体型になった地計算ボタンを使う */}
            {board.isEditMode && (
              <View
                style={{
                  opacity: isAnyProcessing && !isCalculatingTerritory ? 0.4 : 1,
                }}
              >
                <TerritoryCalculatorButton
                  isCalculating={isCalculatingTerritory}
                  resultText={manualTerritory?.result}
                  color={COLORS.primary}
                  onPress={() => {
                    handleCalculateTerritory();
                  }}
                  disabled={isAnyProcessing}
                />
              </View>
            )}

            {/* 🔄 モード切り替えスイッチ（編集モード ↔ 閲覧・再現モード） */}
            <SegmentedIconControl
              value={board.isEditMode}
              onSelect={() => {
                // 🐱 棋譜分析中に編集モードへ入って推論が二重に走るのを防ぐ
                if (botAnalysis.isAnalyzing) botAnalysis.requestStop();
                board.toggleEditMode();
              }}
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
            record={recordForHeader}
            isPlayerBlack={isPlayerBlack}
            playerWin={playerWin}
            isBlackPass={board.isBlackPass}
            isWhitePass={board.isWhitePass}
            currentAgehama={board.currentAgehama}
            simpleComment={false}
            matchType={record.match_type}
            currentIndex={board.currentIndex}
            showWinRateBar={board.isAutoAnalysisEnabled}
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
                  // 盤面サイズ: 1
                  boardSize={board.boardSize}
                  // プレイヤの色: 1
                  playerColor={isPlayerBlack ? BLACK : WHITE}
                  // 現在の盤面、インデックス、テリトリーボード: 3
                  board={
                    board.processed.boardHistory[board.currentIndex] ??
                    board.processed.boardHistory[0] ??
                    {}
                  }
                  currentIndex={board.currentIndex}
                  territoryBoard={
                    manualTerritory?.territoryBoard ??
                    board.processed.territoryBoard
                  }
                  // history系: 3
                  moveHistory={board.processed.moves.slice(
                    0,
                    board.currentIndex + 1,
                  )}
                  boardHistory={board.processed.boardHistory}
                  agehamaHistory={board.processed.agehamaHistory}
                  // タッチした時の処理: 1
                  onPutStone={(grid) => board.handlePutStone(grid, "human")}
                  // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3
                  disabled={!board.isEditMode || board.isAnalyzing}
                  isGameEnded={!board.isEditMode}
                  enableDoubleTap={
                    board.boardSize === 13 ? enableDoubleTap13 : false
                  }
                  // その他情報: 5
                  forceShowTerritory={!!manualTerritory}
                  editMarkers={board.editMarkers}
                  candidatePoints={candidatePoints}
                  moveEvaluationPoint={lastMoveGrid}
                  moveEvaluation={lastMoveEvaluation}
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

                {!board.isEditMode && (
                  <ReplayTapOverlay
                    currentIndex={board.currentIndex}
                    maxIndex={board.maxIdx}
                    onCurrentIndexChange={board.setCurrentIndex}
                  />
                )}
              </View>
            )}
          </View>

          {/* 📈 リプレイコントロール＆グラフ（一体型） */}
          <ScoreLeadReplayControls
            showScoreLeadGraph={board.isAutoAnalysisEnabled}
            analysis={board.combinedAnalysis}
            currentIndex={board.currentIndex}
            totalMoves={board.processed.moves.length}
            onCurrentIndexChange={board.setCurrentIndex}
            primary={COLORS.primary}
            background={COLORS.background}
            backgroundDark={COLORS.backgroundDark}
            foreground={COLORS.foreground}
            primaryDark={COLORS.primaryDark}
            darkObject={COLORS.darkObject}
            darkObjectAccent={COLORS.darkObjectAccent}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
