// PracticeGameScreen.tsx

import { BotPlayStopButtons } from "@/src/components/buttons/BotPlayStopButtons";
import { MyText } from "@/src/components/common/MyText";
import {
  BoardEditScreenHeader,
  HeaderPlayerInfo,
} from "@/src/components/headers/BoardEditScreenHeader";
import LoadingModal from "@/src/components/modals/common/LoadingModal";
import { GameStartModal } from "@/src/components/modals/game/GameStartModal";
import { PassConfirmModal } from "@/src/components/modals/game/PassConfirmModal";
import { PracticeSetupModal } from "@/src/components/modals/game/PracticeSetupModal";
import { GameResultModal } from "@/src/components/modals/game/result/GameResultModal";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { usePracticeSession } from "@/src/hooks/practice/usePracticeSession";
import { usePracticeSettings } from "@/src/hooks/practice/usePracticeSettings";
import { useTranslation } from "@/src/i18n/LangProvider";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GoBoard, ScoreLeadReplayControls } from "go-components";
import {
  BoardSize,
  endsWithDoublePass,
  getDisplayOwnership,
  Grid,
  MatchType,
  movesToBoardHistory,
  PASS_GRID,
  RecordAnalysis,
} from "go-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, MyHeader } from "ui-atoms";
import { PracticeScreenSettingsModal } from "../components/modals/game/settings/PracticeScreenSettingsModal";
import {
  parseAnalysisParam,
  parseMovesParam,
} from "../logics/game/parseMovesParam";
import { ratingToRankIndex } from "../logics/rank/rankLogics";
import { buildRecordFromMatch } from "../logics/record/recordBuilder";
import { PlayerCardView, PlayerType } from "../types/player";

const LAYOUT_CONFIG = {
  // 余白の比率（flex）を設定する
  // A: ヘッダーと三兄弟の間のスペーサー
  // B: 三兄弟と二兄弟の間のスペーサー
  // C: 二兄弟の下のスペーサー
  FLEX_A: 1,
  FLEX_B: 1,
  FLEX_C: 2,
};

// 🌟 PlayerCard用の表示情報(rating / agehamaCount)を、
// ヘッダー用の形(rankIndex / agehama)に翻訳する
const toHeaderPlayer = (p: PlayerCardView): HeaderPlayerInfo => ({
  username: p.username,
  rankIndex: ratingToRankIndex(p.rating),
  iconIndex: p.iconIndex,
  color: p.color,
  agehama: p.agehamaCount,
  showPass: p.showPass,
});

export default function PracticeGameScreen() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const boardWidth = Math.min(width * 0.94, height * 0.6);
  const [hasStarted, setHasStarted] = useState(false);
  const [resumed, setResumed] = useState(false);

  const {
    boardSize,
    setBoardSize,
    matchType,
    setMatchType,
    blackPlayer,
    setBlackPlayer,
    whitePlayer,
    setWhitePlayer,
    myRatingForBoardSize,
    myIconIndex,
    uid,
  } = usePracticeSettings();

  // 🐱 置き碁の初期石込みのプレビュー盤面。
  const previewBoard = useMemo(
    () => movesToBoardHistory(boardSize, matchType, []).boardHistory[0],
    [boardSize, matchType],
  );

  const { from, boardSizeParam, matchTypeParam, movesP, analysisP } =
    useLocalSearchParams<{
      from: string;
      boardSizeParam?: string;
      matchTypeParam?: string;
      movesP?: string | string[]; // 1つだと string、複数だと string[] になる可能性がある
      analysisP?: string; // 途中までの分析結果(JSON文字列)
    }>();

  // 🌟 URLで受け取った盤サイズ・ハンデ。数字として読めない時は undefined にする
  //   (matchType は 0 もありうるので、「0だからダメ」とは判定しない)
  const paramBoardSize = Number(boardSizeParam);
  const paramMatchType = Number(matchTypeParam);
  const resumeBoardSize = Number.isFinite(paramBoardSize)
    ? (paramBoardSize as BoardSize)
    : undefined;
  const resumeMatchType = Number.isFinite(paramMatchType)
    ? (paramMatchType as MatchType)
    : undefined;

  // 🌟 再開の時は、URLの値を使う(読めなかった時は、設定の値)
  const effectiveBoardSize = resumed
    ? (resumeBoardSize ?? boardSize)
    : boardSize;
  const effectiveMatchType = resumed
    ? (resumeMatchType ?? matchType)
    : matchType;

  const parsedMoves: Grid[] = parseMovesParam(movesP, effectiveBoardSize);

  // 🌟 連続パスで終わっている手の列は、再開しても対局が続けられないので、
  //   そのパス2回を外して「パスする前の局面」から再開する。
  const movesParam: Grid[] = endsWithDoublePass(parsedMoves)
    ? parsedMoves.slice(0, -2)
    : parsedMoves;
  // 🌟 連続パスを外した後の手数に合わせて、分析結果もちょん切る
  const initialAnalysis = resumed
    ? parseAnalysisParam(analysisP, movesParam.length)
    : undefined;

  if (hasStarted) {
    return (
      <PracticeGameScreenContent
        boardSize={effectiveBoardSize}
        matchType={effectiveMatchType}
        blackPlayer={blackPlayer}
        whitePlayer={whitePlayer}
        movesParam={resumed ? movesParam : []}
        initialAnalysis={initialAnalysis}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center items-center w-full max-w-160 mx-auto">
        {/* 対局開始前のプレビュー。石は置けない(disabled) */}
        <GoBoard
          boardSize={boardSize}
          matchType={matchType}
          board={previewBoard}
          currentIndex={0}
          boardHistory={[previewBoard]}
          onPutStone={() => {}}
          disabled={true}
          boardWidth={boardWidth}
          boardColor={colors.primary}
          lineColor={colors.background}
          blackStoneColor={colors.blackStone}
          whiteStoneColor={colors.whiteStone}
          humanMoveColor={colors.humanMoveColor}
          botMoveColor={colors.botMoveColor}
          goodMoveColor={colors.success}
          badMoveColor={colors.failure}
          practiceMatchStatus={""}
        />
      </View>

      <PracticeSetupModal
        from={from}
        boardSize={boardSize}
        setBoardSize={setBoardSize}
        blackPlayer={blackPlayer}
        setBlackPlayer={setBlackPlayer}
        whitePlayer={whitePlayer}
        setWhitePlayer={setWhitePlayer}
        matchType={matchType}
        setMatchType={setMatchType}
        onStart={() => {
          setHasStarted(true);
        }}
        onResume={() => {
          setHasStarted(true);
          setResumed(true);
        }}
        myRating={myRatingForBoardSize}
        myIconIndex={myIconIndex}
        myUid={uid ?? ""}
      />
    </SafeAreaView>
  );
}

// 🌟対局中の画面。「対局開始」が押された瞬間にだけマウントされる。
// これにより、内部で呼んでいる usePracticeSession も
// この瞬間のboardSize/matchType/プレイヤーで新しく作られる。
const PracticeGameScreenContent = ({
  boardSize,
  matchType,
  blackPlayer,
  whitePlayer,
  movesParam,
  initialAnalysis,
}: {
  boardSize: BoardSize;
  matchType: MatchType;
  blackPlayer: PlayerType;
  whitePlayer: PlayerType;
  movesParam: Grid[];
  initialAnalysis: RecordAnalysis | undefined;
}) => {
  const t = useTranslation();
  const colors = useColors();
  const { show, hide } = useOverlay();
  const { width, height } = useWindowDimensions();
  const boardWidth = Math.min(width * 0.94, height * 0.6);
  const { uid } = useProfile();
  const fontFamily = useAppFont();

  const {
    boardHistory,
    moves,
    movesRef,
    currentIndex,
    maxViewIndex,
    setCurrentIndex,
    ownership,
    isGameEnded,
    isBotThinking,
    handlePutStone,
    handleResign,
    shouldConfirmPass,
    isPassReady,

    handleTogglePause,
    handleStop,
    isPaused,
    topPlayer,
    bottomPlayer,
    resultRaw,
    resultComment,
    liveAnalysisResult,
    practiceMatchStatus,
    getPlayerGameStartInfo,
    isDoublePass,
    isCalculating,
    isHumanBotMatch,
    showOwnership,
    showWinRateBar,
    showMode,
    isSoundEnabled,
    doubleTap,
  } = usePracticeSession({
    boardSize,
    matchType,
    blackPlayer,
    whitePlayer,
    initialMoves: movesParam,
    initialAnalysis,
  });

  // 🌟 パスボタンを押せないか。botが考え中の時、または
  //   今の局面の判断(パスの確認が要るか)がまだ終わっていない時。
  const isPassDisabled = isBotThinking || !isPassReady;

  // 🌟最新のhandlePutStoneを指すref。確認モーダルの「はい」から呼ぶ時に、
  //   モーダルを出した時点の古い関数を使ってしまわないため。
  const handlePutStoneRef = useRef(handlePutStone);
  useEffect(() => {
    handlePutStoneRef.current = handlePutStone;
  });

  // パスボタンを押した時の処理。
  // 終局していない局面でのパスは、確認のモーダルを出す。
  //   「はい」→ パスする / 「いいえ」→ 何もしない(手を打っていない状態のまま)
  // 終局している局面、または分析がまだ届いていなくて判定できない時は、
  // 確認なしでそのままパスする。
  const handlePassPress = () => {
    if (!shouldConfirmPass()) {
      handlePutStone(PASS_GRID);
      return;
    }
    show(
      <PassConfirmModal
        onYes={() => {
          hide();
          handlePutStoneRef.current(PASS_GRID);
        }}
        onNo={hide}
      />,
    );
  };

  // いま見ている局面の ownership(予想)から作った地。
  // 見せる局面は「分析が届いた局面」までなので、ライブ中でも通常は null にならない。
  // ownership が無い局面(分析の失敗など)は null(=何も出さない)。
  const ownershipTerritoryBoard = useMemo(
    () =>
      showOwnership
        ? getDisplayOwnership(
            boardSize,
            boardHistory[currentIndex],
            liveAnalysisResult,
            currentIndex,
          )
        : null,
    [showOwnership, boardSize, boardHistory, currentIndex, liveAnalysisResult],
  );

  const isPlayerBlack = blackPlayer.uid === uid;
  const blackWins = resultRaw?.startsWith("B")
    ? true
    : resultRaw?.startsWith("W")
      ? false
      : undefined;
  const playerWin = !isHumanBotMatch
    ? undefined
    : isPlayerBlack
      ? blackWins
      : !blackWins;

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
    show(<LoadingModal />);
  }, [isCalculating]);

  // 🐱 終局時: 棋譜保存→BoardEditScreenへ遷移→結果モーダル表示
  useEffect(() => {
    if (!isGameEnded) return;

    // 🌟 棋譜に入れるアイコン・レートは、この対局の盤サイズでの値(再開で設定と
    //   盤サイズが違っても、ずれないように)。対局開始モーダルと同じ窓口から取る。
    const blackInfo = getPlayerGameStartInfo(blackPlayer);
    const whiteInfo = getPlayerGameStartInfo(whitePlayer);

    const record = buildRecordFromMatch({
      matchId: "", // 適当
      boardSize,
      matchType,
      moves: movesRef.current,
      result: resultRaw,
      blackUid: blackPlayer.uid ?? "",
      blackUsername: blackPlayer.username,
      blackIconIndex: blackInfo.iconIndex,
      blackRankIndex: ratingToRankIndex(blackInfo.ratingOrRank),
      blackRating: blackInfo.ratingOrRank,
      whiteUid: whitePlayer.uid ?? "",
      whiteUsername: whitePlayer.username,
      whiteIconIndex: whiteInfo.iconIndex,
      whiteRankIndex: ratingToRankIndex(whiteInfo.ratingOrRank),
      whiteRating: whiteInfo.ratingOrRank,
      analysis: liveAnalysisResult,
    });

    router.replace({
      // 2026/10/05: ⚠️ここはreplaceでなければならない
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
        matchType={matchType}
        moves={moves.slice(0, currentIndex)} // 今の盤面までちょん切る
        analysis={{
          pos: liveAnalysisResult.pos.slice(0, currentIndex + 1),
        }}
        visible={true}
        resultComment={resultComment}
        onClose={hide}
        ratingBefore={0}
        ratingAfter={0}
        rankIndexBefore={0}
        rankIndexAfter={0}
        from={"PracticeGameScreen"}
        giantKillingStreak={null}
        playerWin={playerWin}
      />,
    );
  }, [isGameEnded]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-160 mx-auto px-4 pt-2">
        {/* ─── ヘッダー ─── */}
        <MyHeader
          left={
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  // 2026/10/17: ⚠️ここはreplaceでなければならない
                  router.replace({
                    pathname: "/PracticeGameScreen",
                    params: {
                      matchTypeParam: matchType,
                      boardSizeParam: boardSize,
                      movesP: moves,
                      analysisP: JSON.stringify(liveAnalysisResult),
                    },
                  });
                } else {
                  router.replace({ pathname: "/HomeScreen" });
                }
              }}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={36} color={colors.textSub} />
            </TouchableOpacity>
          }
          right={
            <IconButton
              icon={<FontAwesome6 name={"gear"} />}
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundStrong}
              onPress={() => {
                show(
                  <PracticeScreenSettingsModal
                    onClose={hide}
                    boardSize={boardSize}
                    isBotBot={practiceMatchStatus === "bot_bot"}
                  />,
                );
              }}
            />
          }
        />

        {/* コンテンツ領域 */}
        {/* ─── 余白 A ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_A }} />
        {/* ─── [2]兄弟 ─── */}
        <View className="items-center gap-2">
          <View
            style={{
              width: boardWidth,
            }}
          >
            <BoardEditScreenHeader
              analysis={liveAnalysisResult}
              leftPlayer={toHeaderPlayer(bottomPlayer)}
              rightPlayer={toHeaderPlayer(topPlayer)}
              currentIndex={currentIndex}
              showWinRateBar={
                practiceMatchStatus === "bot_bot" && showWinRateBar
              }
            />
          </View>
          <GoBoard
            boardSize={boardSize}
            matchType={matchType}
            playerColor={bottomPlayer.color}
            board={boardHistory[currentIndex] ?? {}}
            currentIndex={currentIndex}
            ownership={ownershipTerritoryBoard ?? ownership}
            moveHistory={moves.slice(0, currentIndex + 1)}
            boardHistory={boardHistory}
            onPutStone={handlePutStone}
            disabled={isGameEnded || isBotThinking}
            isGameEnded={isGameEnded}
            doubleTap={doubleTap}
            forceShowTerritory={
              practiceMatchStatus === "bot_bot" &&
              ownershipTerritoryBoard !== null
            }
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
                isPassDisabled
                  ? "border-backgroundStrong"
                  : "border-primaryStrong"
              }`}
              onPress={handlePassPress}
              disabled={isPassDisabled}
              activeOpacity={0.7}
            >
              <MyText
                className="text-lg"
                style={{
                  color: isPassDisabled
                    ? colors.backgroundStrong
                    : colors.primaryStrong,
                }}
              >
                {t("common.pass")}
              </MyText>
            </TouchableOpacity>
            {/* 投了ボタン */}
            <TouchableOpacity
              className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
                isPassDisabled ? "border-failureLight" : "border-failure" // 元はisBotThinking。だがUI的にパスに合わせる
              }`}
              onPress={handleResign}
              disabled={isPassDisabled} // 元はisBotThinking。だがUI的にパスに合わせる
              activeOpacity={0.7}
            >
              <MyText
                className="text-lg"
                style={{
                  color: isPassDisabled ? colors.failureLight : colors.failure, // 元はisBotThinking。だがUI的にパスに合わせる
                }}
              >
                {t("common.resign")}
              </MyText>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── botbot戦の場合は分析・再生コントロールも ─── */}
        {!isGameEnded && !isDoublePass && practiceMatchStatus === "bot_bot" && (
          <View className="gap-2">
            <ScoreLeadReplayControls
              showMode={showMode} // 一旦
              analysis={liveAnalysisResult}
              currentIndex={currentIndex}
              totalMoves={maxViewIndex}
              onCurrentIndexChange={setCurrentIndex}
              backgroundStrong={colors.backgroundStrong}
              foreground={colors.foreground}
              primaryStrong={colors.primaryStrong}
              fontFamily={fontFamily}
            />
            <BotPlayStopButtons
              isPaused={isPaused}
              disabled={isCalculating}
              onTogglePause={handleTogglePause}
              onStop={handleStop}
            />
          </View>
        )}

        {/* ─── 余白 C ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_C }} />
      </View>
    </SafeAreaView>
  );
};
