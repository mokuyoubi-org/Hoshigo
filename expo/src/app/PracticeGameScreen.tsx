// PracticeGameScreen.tsx

import { PlayerCard } from "@/src/active/components/cards/PlayerCard";

import { useTranslation } from "@/src/active/i18n/LangProvider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GoBoard } from "go-components";
import {
  BLACK,
  BoardSize,
  MatchType,
  movesToBoardHistory,
  PASS_GRID,
} from "go-core";
import React, { useEffect, useMemo, useState } from "react";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "../active/components/common/AppText";

import { useOverlay } from "../active/contexts/OverlayContext";
import {
  PlayerType,
  usePracticeSession,
} from "../active/hooks/practice/usePracticeSession";
import { usePracticeSettings } from "../active/hooks/practice/usePracticeSettings";
import { useColors } from "../active/hooks/useTheme";
import { ratingToRankIndex } from "../stable/logics/rankLogics";
import { buildRecordFromMatch } from "../stable/logics/recordBuilder";
import { GameResultModal } from "../active/modals/gameresult/GameResultModal";
import { GameStartModal } from "../active/modals/GameStartModal";
import LoadingModal from "../active/modals/LoadingModal";
import { PracticeSetupModal } from "../active/modals/PracticeSetupModal";

const LAYOUT_CONFIG = {
  // 余白の比率（flex）を設定する
  // A: ヘッダーと三兄弟の間のスペーサー
  // B: 三兄弟と二兄弟の間のスペーサー
  // C: 二兄弟の下のスペーサー
  FLEX_A: 1,
  FLEX_B: 1,
  FLEX_C: 2,
};

export default function PracticeGameScreen() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const boardWidth = Math.min(width * 0.94, height * 0.6);
  const [hasStarted, setHasStarted] = useState(false);

  const {
    boardSize,
    setBoardSize,
    matchType,
    setMatchType,
    blackPlayer,
    setBlackPlayer,
    whitePlayer,
    setWhitePlayer,
    isLoaded,
    isSoundEnabled,
    doubleTap,
    myRatingForBoardSize,
    myIconIndex,
    uid,
  } = usePracticeSettings();

  // 🐱 置き碁の初期石込みのプレビュー盤面。
  const previewBoard = useMemo(
    () => movesToBoardHistory(boardSize, matchType, []).boardHistory[0],
    [boardSize, matchType],
  );

  if (hasStarted) {
    return (
      <PracticeGameScreenContent
        boardSize={boardSize}
        matchType={matchType}
        blackPlayer={blackPlayer}
        whitePlayer={whitePlayer}
        isSoundEnabled={isSoundEnabled}
        doubleTap={doubleTap}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center items-center w-full max-w-160 mx-auto">
        <GoBoard
          // 対局開始前プレビュー用。ただのプレビューなので値は適当
          boardSize={boardSize}
          matchType={matchType}
          playerColor={BLACK} // 適当
          board={previewBoard}
          currentIndex={0} // 適当
          territoryBoard={[]} // 適当
          moveHistory={[]} // 適当
          boardHistory={[previewBoard]}
          agehamaHistory={[{ black: 0, white: 0 }]} // 適当
          onPutStone={() => {}} // 適当
          disabled={true}
          isGameEnded={false} // 適当
          doubleTap={false} // 適当
          forceShowTerritory={false} // 適当
          editMarkers={new Map()} // 適当
          candidatePoints={[]} // 適当
          moveEvaluationPoint={0} // 適当
          moveEvaluation={undefined} // 適当
          boardWidth={boardWidth}
          boardColor={colors.primary}
          lineColor={colors.background}
          blackStoneColor={colors.blackStone}
          whiteStoneColor={colors.whiteStone}
          humanMoveColor={colors.humanMoveColor}
          botMoveColor={colors.botMoveColor}
          goodMoveColor={colors.success}
          badMoveColor={colors.failure}
          sound={false} // 適当
          practiceMatchStatus={""} // 適当
        />
      </View>

      <PracticeSetupModal
        boardSize={boardSize}
        setBoardSize={setBoardSize}
        blackPlayer={blackPlayer}
        setBlackPlayer={setBlackPlayer}
        whitePlayer={whitePlayer}
        setWhitePlayer={setWhitePlayer}
        matchType={matchType}
        setMatchType={setMatchType}
        onStart={() => setHasStarted(true)}
        isLoaded={isLoaded}
        myRating={myRatingForBoardSize}
        myIconIndex={myIconIndex}
        myUid={uid ?? ""}
      />
    </SafeAreaView>
  );
}

// 🌟対局中の画面。「対局開始」が押された瞬間にだけマウントされる。
// これにより、内部で呼んでいる usePracticeSession (と useGoGame) も
// この瞬間のboardSize/matchType/プレイヤーで新しく作られる。
function PracticeGameScreenContent({
  boardSize,
  matchType,
  blackPlayer,
  whitePlayer,
  isSoundEnabled,
  doubleTap,
}: {
  boardSize: BoardSize;
  matchType: MatchType;
  blackPlayer: PlayerType;
  whitePlayer: PlayerType;
  isSoundEnabled: boolean;
  doubleTap: boolean;
}) {
  const t = useTranslation();
  const colors = useColors();
  const { show, hide } = useOverlay();
  const { width, height } = useWindowDimensions();
  const boardWidth = Math.min(width * 0.94, height * 0.6);

  const {
    boardHistory,
    agehamaHistory,
    moves,
    movesRef,
    currentIndex,
    territoryBoard,
    isGameEnded,
    isBotThinking,
    handlePutStone,
    handleResign,
    topPlayerView,
    bottomPlayerView,
    resultRaw,
    resultComment,
    finalDeadStones,
    liveAnalysisResult,
    practiceMatchStatus,
    getPlayerGameStartInfo,
    isDoublePass,
    isCalculating,
  } = usePracticeSession({ boardSize, matchType, blackPlayer, whitePlayer });

  useEffect(() => {
    // ⚠️⚠️⚠️謎のエラーを防ぐための部分なので消さない。これがないとBlocked aria-hidden...とか言われる
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

  // 🐱 対局開始時の挨拶モーダル
  useEffect(() => {
    show(
      <GameStartModal
        blackPlayer={getPlayerGameStartInfo(blackPlayer)}
        whitePlayer={getPlayerGameStartInfo(whitePlayer)}
        matchType={matchType}
        onClose={hide}
      />,
    );
  }, []);

  // 計算中のモーダル
  useEffect(() => {
    if (!isCalculating) {
      return;
    }
    console.log("show_LoadingModal");
    show(<LoadingModal />);
  }, [isCalculating]);

  // 🐱 終局時: 棋譜保存→BoardEditScreenへ遷移→結果モーダル表示
  useEffect(() => {
    if (!isGameEnded) return;

    const record = buildRecordFromMatch({
      matchId: 0, // 適当
      boardSize,
      matchType,
      moves: movesRef.current,
      deadStones: finalDeadStones,
      result: resultRaw,
      blackUid: blackPlayer.uid, // botは適当
      blackUsername: blackPlayer.username,
      blackIconIndex: blackPlayer.iconIndex,
      blackRankIndex: ratingToRankIndex(blackPlayer.rating),
      blackRating: blackPlayer.rating,
      whiteUid: whitePlayer.uid, // botは適当
      whiteUsername: whitePlayer.username,
      whiteIconIndex: whitePlayer.iconIndex,
      whiteRankIndex: ratingToRankIndex(whitePlayer.rating),
      whiteRating: whitePlayer.rating,
      analysis: liveAnalysisResult,
    });

    router.replace({
      pathname: "/BoardEditScreen",
      params: {
        recordParam: JSON.stringify(record),
        from: "PracticeGameScreen",
        resultComment,
        practiceMatchStatus: practiceMatchStatus,
      },
    });

    show(
      <GameResultModal
        boardSize={boardSize}
        visible={true}
        resultComment={resultComment}
        onClose={hide}
        ratingBefore={0}
        ratingAfter={0}
        rankIndexBefore={0}
        rankIndexAfter={0}
        from={"PracticeGameScreen"}
        giantKillingStreak={0}
        giantKillingBonus={false}
      />,
    );
  }, [isGameEnded]);

  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-160 mx-auto px-5">
        {/* ─── ヘッダー ─── */}
        <View className="mt-2 h-11 justify-center">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/HomeScreen");
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={36} color={colors.textSub} />
          </TouchableOpacity>
        </View>

        {/* コンテンツ領域 */}
        {/* ─── 余白 A ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_A }} />

        {/* ─── 三兄弟 ─── */}
        <View className="items-center gap-2">
          <View style={{ width: boardWidth }}>
            <PlayerCard
              username={topPlayerView.username}
              iconIndex={topPlayerView.iconIndex}
              rating={topPlayerView.rating}
              color={topPlayerView.color}
              isLeft={true}
              showPass={topPlayerView.showPass}
              agehamaCount={topPlayerView.agehamaCount}
            />
          </View>

          <GoBoard
            boardSize={boardSize}
            matchType={matchType}
            playerColor={bottomPlayerView.color}
            board={boardHistory[currentIndex] ?? {}}
            currentIndex={currentIndex}
            territoryBoard={territoryBoard}
            moveHistory={moves}
            boardHistory={boardHistory}
            agehamaHistory={agehamaHistory}
            onPutStone={handlePutStone}
            disabled={isGameEnded || isBotThinking}
            isGameEnded={isGameEnded}
            doubleTap={doubleTap}
            forceShowTerritory={false}
            editMarkers={new Map()}
            candidatePoints={[]}
            moveEvaluationPoint={0}
            moveEvaluation={undefined}
            boardWidth={boardWidth}
            boardColor={colors.primary}
            lineColor={colors.background}
            blackStoneColor={colors.blackStone}
            whiteStoneColor={colors.whiteStone}
            humanMoveColor={colors.humanMoveColor}
            botMoveColor={colors.botMoveColor}
            goodMoveColor={colors.success}
            badMoveColor={colors.failure}
            sound={isSoundEnabled}
            practiceMatchStatus={practiceMatchStatus}
          />

          <View style={{ width: boardWidth }}>
            <PlayerCard
              username={bottomPlayerView.username}
              iconIndex={bottomPlayerView.iconIndex}
              rating={bottomPlayerView.rating}
              color={bottomPlayerView.color}
              isLeft={false}
              showPass={bottomPlayerView.showPass}
              agehamaCount={bottomPlayerView.agehamaCount}
            />
          </View>
        </View>

        {/* ─── 余白 B ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_B }} />

        {/* ─── 二兄弟 ─── */}
        {!isGameEnded && !isDoublePass && practiceMatchStatus !== "bot_bot" && (
          <View
            className="flex-row gap-2 self-center"
            style={{ width: boardWidth }}
          >
             {/* パスボタン */}
            <TouchableOpacity
              className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
                isBotThinking
                  ? "border-backgroundStrong"
                  : "border-primaryStrong"
              }`}
              onPress={() => handlePutStone(PASS_GRID)}
              disabled={isBotThinking}
              activeOpacity={0.7}
            >
              <AppText
                className="text-lg"
                style={{
                  color: isBotThinking
                    ? colors.backgroundStrong
                    : colors.primaryStrong,
                }}
              >
                {t("common.pass")}
              </AppText>
            </TouchableOpacity>
             {/* 投了ボタン */}
            <TouchableOpacity
              className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
                isBotThinking ? "border-failureLight" : "border-failure"
              }`}
              onPress={handleResign}
              disabled={isBotThinking}
              activeOpacity={0.7}
            >
              <AppText
                className="text-lg"
                style={{
                  color: isBotThinking ? colors.failureLight : colors.failure,
                }}
              >
                {t("common.resign")}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 余白 C ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_C }} />
      </View>
    </SafeAreaView>
  );
}
