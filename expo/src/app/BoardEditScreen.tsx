// BoardEditScreen.tsx

import { TerritoryResultButton } from "@/src/components/buttons/TerritoryResultButton";
import {
  BoardEditScreenHeader,
  HeaderPlayerInfo,
} from "@/src/components/headers/BoardEditScreenHeader";
import { BoardEditScreenSettingsModal } from "@/src/components/modals/boardEdit/BoardEditScreenSettingsModal";
import { GameResultModal } from "@/src/components/modals/result/GameResultModal";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useRecordAnalysisLoop } from "@/src/hooks/ai/useRecordAnalysisLoop";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useBoardEditActions } from "@/src/hooks/edit/useBoardEditActions";
import { useEditableGoBoard } from "@/src/hooks/edit/useEditableGoBoard";
import { useReplayMoveEvaluation } from "@/src/hooks/edit/useReplayMoveEvaluation";
import { RecordType } from "@/src/types/record";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  GoBoard,
  ReplayTapOverlay,
  ScoreLeadReplayControls,
} from "go-components";
import { BLACK, TerritoryBoard, WHITE } from "go-core";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, ScreenHeader, SegmentedIconControl } from "ui-atoms";
import { useBlurActiveElement } from "../hooks/common/useBlurActiveElement";
import { FromType } from "../types/from";

// ─── レイアウト定数 ───
const LAYOUT_CONFIG = {
  // 余白の比率（flex）を設定する
  // A: ヘッダーとカードの間
  // B: カードと碁盤の間
  // C: 碁盤とリプレイコントロールの間
  // D: リプレイコントロールの下
  FLEX_A: 1,
  FLEX_B: 1,
  FLEX_C: 1,
  FLEX_D: 1,
};

export default function BoardEditScreen() {
  // 🐱 matchId と initialRecord の両方を受け取れるようにする
  const {
    matchId,
    recordParam,
    from,
    resultComment,
    rankIndexBefore,
    rankIndexAfter,
    ratingBefore,
    ratingAfter,
    practiceMatchStatus,
    giantKillingStreak,
    giantKillingBonus,
    whiteRotation,
  } = useLocalSearchParams<{
    matchId?: string;
    recordParam?: string;
    from: FromType;
    resultComment?: string;
    rankIndexBefore?: string;
    rankIndexAfter?: string;
    ratingBefore?: string;
    ratingAfter?: string;
    practiceMatchStatus?: string;
    giantKillingStreak?: string;
    giantKillingBonus?: string;
    whiteRotation?: string;
  }>();

  const [record, setRecord] = useState<RecordType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useBlurActiveElement();

  useEffect(() => {
    let isMounted = true;

    const loadRecord = async () => {
      try {
        setIsLoading(true);

        // 1. 本体（JSON文字列）が渡されていればパースしてそのまま使う
        if (recordParam) {
          const parsed = JSON.parse(recordParam) as RecordType;
          if (isMounted) {
            setRecord(parsed);
            setIsLoading(false);
          }
          return;
        }

        // 2. 本体がなくて matchId だけあるなら DB から取ってくる
        // if (matchId) {
        //   const targetId = Number(matchId);
        //   if (!isNaN(targetId)) {
        //     const data = await recordsRepo.getById(targetId);
        //     if (isMounted) setRecord(data);
        //   }
        // }
      } catch (e) {
        console.error("Failed to load record:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRecord();

    return () => {
      isMounted = false;
    };
  }, [matchId, recordParam]);

  // 🔔 matchId経由(DB由来)のときだけ、他の場所での書き込みに気づいて取り直す
  // useEffect(() => {
  //   if (!matchId) return;
  //   const targetId = Number(matchId);
  //   if (isNaN(targetId)) return;

  //   return subscribeToRecordsChange(() => {
  //     recordsRepo.getById(targetId).then((data) => {
  //       if (data) setRecord(data);
  //     });
  //   });
  // }, [matchId]);

  if (isLoading || !record) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        {/* <ActivityIndicator size="large" color={colors.primary} />
        <MyText className="text-text mt-2">{t("common.loading")}...</MyText> */}
      </SafeAreaView>
    );
  }

  return (
    <BoardEditScreenContent
      record={record}
      from={from}
      resultComment={resultComment}
      rankIndexBefore={Number(rankIndexBefore)}
      rankIndexAfter={Number(rankIndexAfter)}
      ratingBefore={Number(ratingBefore)}
      ratingAfter={Number(ratingAfter)}
      practiceMatchStatus={practiceMatchStatus ?? ""}
      giantKillingStreak={Number(giantKillingStreak)}
      giantKillingBonus={giantKillingBonus === "giantKillingBonus"}
      whiteRotation={whiteRotation}
    />
  );
}

const BoardEditScreenContent = ({
  record,
  from,
  resultComment,
  rankIndexBefore,
  rankIndexAfter,
  ratingBefore,
  ratingAfter,
  practiceMatchStatus,
  giantKillingStreak,
  giantKillingBonus,
  whiteRotation,
}: {
  record: RecordType;
  from: FromType;
  resultComment?: string;
  rankIndexBefore: number;
  rankIndexAfter: number;
  ratingBefore: number;
  ratingAfter: number;
  practiceMatchStatus: string;
  giantKillingStreak: number;
  giantKillingBonus: boolean;
  whiteRotation: string | undefined;
}) => {
  const fontFamily = useAppFont();
  const colors = useColors();
  const { show, hide } = useOverlay();
  const { width, height } = useWindowDimensions();
  const heightRatio = height / width;
  const widthRatio = width / height;

  const { uid } = useProfile();

  // 🐱 棋譜モード専用：手ごとのKataGo解析を進める・止める・DBに永続化する
  const analysisLoop = useRecordAnalysisLoop(record);

  // 🐱 「完全に分析済みか」は手ごとの解析(analyzedCount)に加えて、最後の1手の
  //    効果を測るための最終局面(perMove[totalMoves])まで埋まっているかも見る
  const isFullyAnalyzed =
    analysisLoop.analyzedCount >= analysisLoop.totalMoves &&
    analysisLoop.analysis.perMove[analysisLoop.totalMoves] != null;

  // 🐱 botAnalysisが進めた解析結果を反映させたrecord。編集モードの分析キャッシュも
  //    リプレイモードの好手/悪手判定も、どちらもこちらを見るようにする
  const liveRecord = useMemo(
    () => ({ ...record, analysis: analysisLoop.analysis }),
    [record, analysisLoop.analysis],
  );

  // 🐱 編集モード・盤面履歴・分析キャッシュはすべてここに集約されている
  const board = useEditableGoBoard(liveRecord);

  // 🐱 ボット思考ボタンの処理と、地計算の結果・盤面への地表示
  const {
    territoryResult,
    manualTerritory,
    handleShowTerritory,
    handleBotSuggest,
    isBotSuggesting,
    isAnyProcessing,
  } = useBoardEditActions(board, board.boardSize);
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

  // 🐱 地の盤面は、useBoardEditActionsのterritoryResult(分析の ownership が元)だけを
  //    見る。確定した最終局面でも、それ以外の局面でも、同じ窓口から取る。
  const currentTerritoryBoard = territoryResult?.territoryBoard ?? null;

  // 🐱 地を出さない時に渡す、全部0の盤面(territoryBoardの必須の値を埋めるだけ)
  const emptyTerritoryBoard: TerritoryBoard = useMemo(
    () =>
      Array.from({ length: board.boardSize }, () =>
        Array(board.boardSize).fill(0),
      ),
    [board.boardSize],
  );

  // 🐱 棋譜モードで、一番最後の手の局面を見ていて、その手の並びが連続パスで
  //    終わっている時は「確定した終局局面」として、地を常に表示する。
  const isAtConfirmedFinalPosition =
    !board.isEditMode &&
    board.currentIndex === board.maxIdx &&
    !!territoryResult?.isFinal;

  // 🐱 盤面に出す地。確定した終局局面では常に、それ以外ではバッジをタップした時か、
  //    設定(showOwnershipTerritoryBoard)がonの時だけ出す。
  const territoryBoardToShow =
    isAtConfirmedFinalPosition ||
    !!manualTerritory ||
    board.showOwnershipTerritoryBoard
      ? currentTerritoryBoard
      : null;

  const isUserBlack = record.black_uid === uid;
  const isUserWhite = record.white_uid === uid;
  const isUserParticipant = isUserBlack || isUserWhite; // 🔥自分が対局者として実在するか
  const isHumanHumanMatch = isUserBlack && isUserWhite;
  const isBotBotMatch = !isUserBlack && !isUserWhite;

  const isMyBlack = isUserBlack; // 互換のため名称は維持(黒番かどうかの判定に使用)

  const blackWins = record.result?.startsWith("B")
    ? true
    : record.result?.startsWith("W")
      ? false
      : undefined;
  const playerWin =
    blackWins === undefined || isBotBotMatch || isHumanHumanMatch
      ? undefined // botbotもしくはhumanhumanの場合、モーダルの文字は赤や緑にはならない、ということ
      : isMyBlack
        ? blackWins
        : !blackWins;

  const boardWidth = width > height - 210 ? height * 0.7 : width * 0.96;

  const { iconIndex } = useProfile();
  // プレイヤーと対戦相手の情報をまとめる(自分が対局者である場合のみ使用)
  const playerColor = isMyBlack ? BLACK : WHITE;
  const playerRankIndex = isMyBlack
    ? recordForHeader.black_rank_index
    : recordForHeader.white_rank_index;
  const playerAgehama = isMyBlack
    ? board.currentAgehama.black
    : board.currentAgehama.white;
  const playerPass = isMyBlack ? board.isBlackPass : board.isWhitePass;
  const myUsername = isMyBlack
    ? recordForHeader.black_username
    : recordForHeader.white_username;
  const oppUsername = isMyBlack
    ? recordForHeader.white_username
    : recordForHeader.black_username;
  const oppColor = isMyBlack ? WHITE : BLACK;
  const oppRankIndex = isMyBlack
    ? recordForHeader.white_rank_index
    : recordForHeader.black_rank_index;
  const oppAgehama = isMyBlack
    ? board.currentAgehama.white
    : board.currentAgehama.black;
  const oppPass = isMyBlack ? board.isWhitePass : board.isBlackPass;
  const oppIconIndex = isMyBlack
    ? recordForHeader.white_icon_index
    : recordForHeader.black_icon_index;

  // 左側プレイヤーの情報
  // 自分が対局者として存在する場合は自分視点(黒/白どちらでも「user」を左に)、
  // 存在しない場合(bot vs bot など)は単純に黒番を左側に表示する
  const leftPlayer: HeaderPlayerInfo = isUserParticipant
    ? {
        username: myUsername,
        rankIndex: playerRankIndex,
        iconIndex: iconIndex ?? 0,
        color: playerColor,
        agehama: playerAgehama,
        showPass: playerPass,
      }
    : {
        username: recordForHeader.black_username,
        rankIndex: recordForHeader.black_rank_index,
        iconIndex: recordForHeader.black_icon_index,
        color: BLACK,
        agehama: board.currentAgehama.black,
        showPass: board.isBlackPass,
      };

  // 右側プレイヤーの情報
  const rightPlayer: HeaderPlayerInfo = isUserParticipant
    ? {
        username: oppUsername,
        rankIndex: oppRankIndex,
        iconIndex: oppIconIndex,
        color: oppColor,
        agehama: oppAgehama,
        showPass: oppPass,
      }
    : {
        username: recordForHeader.white_username,
        rankIndex: recordForHeader.white_rank_index,
        iconIndex: recordForHeader.white_icon_index,
        color: WHITE,
        agehama: board.currentAgehama.white,
        showPass: board.isWhitePass,
      };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-160 mx-auto px-4 pt-2">
        {/* ヘッダー */}
        <ScreenHeader
          left={
            <View className="flex-row items-center gap-4">
              {/* 戻るボタン */}
              {/* {from === "RecordScreen" && (
                <TouchableOpacity
                  onPress={() => {
                    // 🐱 分析ループが裏で走ったままナビゲーションするのを防ぐ
                    if (analysisLoop.isAnalyzing) analysisLoop.requestStop();
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace({ pathname: "/HomeScreen" });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="chevron-left"
                    size={36}
                    color={colors.textSub}
                  />
                </TouchableOpacity>
              )} */}

              {/* メニューボタン */}
              {
                <TouchableOpacity
                  onPress={() => {
                    if (analysisLoop.isAnalyzing) analysisLoop.requestStop();

                    // 🌟 いま見ている局面(currentIndex手打った後)までの手と分析だけを渡す。
                    //   結果モーダルの「練習モードへ」「もう一度練習」で、そのまま途中再開に使われる。
                    //   分岐した後でも正しい合成データ(combinedAnalysis)を使う。
                    const movesUpToCurrent = board.processed.moves.slice(
                      0,
                      board.currentIndex,
                    );
                    const analysisUpToCurrent = {
                      perMove: board.combinedAnalysis.perMove.slice(
                        0,
                        board.currentIndex + 1,
                      ),
                    };

                    show(
                      <GameResultModal
                        boardSize={board.boardSize}
                        matchType={record.match_type}
                        moves={movesUpToCurrent}
                        analysis={analysisUpToCurrent}
                        visible={true}
                        resultComment={resultComment}
                        onClose={hide}
                        ratingBefore={ratingBefore}
                        ratingAfter={ratingAfter}
                        rankIndexBefore={rankIndexBefore}
                        rankIndexAfter={rankIndexAfter}
                        from={from}
                        giantKillingStreak={giantKillingStreak}
                        giantKillingBonus={giantKillingBonus}
                        playerWin={playerWin}
                      />,
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="menu" size={32} color={colors.primaryStrong} />
                </TouchableOpacity>
              }
            </View>
          }
          right={
            <View className="flex-row items-center gap-2">
              {/* 分析📈ボタン */}
              {!board.isEditMode &&
                !isFullyAnalyzed &&
                board.processed.moves.length >= 1 && (
                  <IconButton
                    icon={
                      analysisLoop.isAnalyzing ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : (
                        <Octicons name="graph" />
                      )
                    }
                    iconColor={colors.primary}
                    backgroundColor={colors.foreground}
                    borderColor={colors.backgroundStrong}
                    onPress={analysisLoop.toggleAnalysis}
                  />
                )}

              {/* ボット🤖ボタン */}
              {board.isEditMode && (
                <IconButton
                  icon={
                    isBotSuggesting ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <MaterialCommunityIcons name="robot" />
                    )
                  }
                  iconColor={colors.botMoveColor}
                  backgroundColor={colors.foreground}
                  borderColor={colors.backgroundStrong}
                  onPress={handleBotSuggest}
                  disabled={isAnyProcessing}
                  style={{
                    opacity: isAnyProcessing && !isBotSuggesting ? 0.4 : 1,
                  }}
                />
              )}

              {/* 地計算🧮ボタン。計算中はくるくる、結果なしなら何も出ない。
                普段は電卓マークだけ。タップすると、結果テキストと盤面の地を表示する */}
              {board.showTerritoryResultBadge && (
                <TerritoryResultButton
                  isCalculating={
                    !territoryResult &&
                    (board.isAnalyzing || analysisLoop.isAnalyzing)
                  }
                  result={territoryResult}
                  isShown={!!manualTerritory}
                  onPress={handleShowTerritory}
                />
              )}

              {/* 🔄 モード切り替えスイッチ */}
              <SegmentedIconControl
                trackBackgroundColor={colors.backgroundStrong}
                activeSegmentBackgroundColor={colors.foreground}
                activeIconColor={colors.text}
                inactiveIconColor={colors.textSub}
                value={board.isEditMode}
                onSelect={() => {
                  if (analysisLoop.isAnalyzing) analysisLoop.requestStop();
                  board.toggleEditMode();
                }}
                options={[
                  {
                    value: false,
                    icon: <FontAwesome6 name="book-open" />,
                    color: colors.primary,
                  },
                  {
                    value: true,
                    icon: <MaterialIcons name="edit" />,
                    color: colors.humanMoveColor,
                  },
                ]}
              />

              {/* 設定ボタン⚙️ */}
              <IconButton
                icon={<FontAwesome6 name={"gear"} />}
                iconColor={colors.primary}
                backgroundColor={colors.foreground}
                borderColor={colors.backgroundStrong}
                onPress={() => {
                  show(
                    <BoardEditScreenSettingsModal
                      onClose={hide}
                      boardSize={board.boardSize}
                    />,
                  );
                }}
              />
            </View>
          }
        />

        {/* コンテンツ領域 */}

        <View className="flex-1 px-2">
          {/* ─── 余白 a ─── */}
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_A }} />

          <BoardEditScreenHeader
            analysis={board.combinedAnalysis}
            leftPlayer={leftPlayer}
            rightPlayer={rightPlayer}
            currentIndex={board.currentIndex}
            showWinRateBar={board.showWinRateBar}
          />

          {/* ─── 余白 B ─── */}
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_B * widthRatio }} />

          {/* 碁盤エリア */}
          <View className="justify-center items-center">
            {boardWidth > 0 && (
              <View
                style={{
                  width: boardWidth,
                  height: boardWidth,
                  position: "relative",
                  transform:
                    whiteRotation === "whiteRotation"
                      ? [{ rotate: "180deg" }]
                      : undefined,
                }}
              >
                <GoBoard
                  // 盤面サイズ: 1
                  boardSize={board.boardSize}
                  matchType={record.match_type}
                  // プレイヤの色: 1
                  playerColor={isMyBlack ? BLACK : WHITE}
                  // 現在の盤面、インデックス、テリトリーボード: 3
                  // 現在の盤面、インデックス、テリトリーボード: 3
                  board={
                    board.processed.boardHistory[board.currentIndex] ??
                    board.processed.boardHistory[0] ??
                    {}
                  }
                  currentIndex={board.currentIndex}
                  territoryBoard={territoryBoardToShow ?? emptyTerritoryBoard}
                  forceShowTerritory={
                    !isAtConfirmedFinalPosition && !!territoryBoardToShow
                  }
                  // history系: 3
                  moveHistory={board.processed.moves.slice(
                    0,
                    board.currentIndex + 1,
                  )}
                  boardHistory={board.processed.boardHistory}
                  agehamaHistory={board.processed.agehamaHistory}
                  // タッチした時の処理: 1
                  onPutStone={(grid) => board.handleEditStone(grid, "human")}
                  // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3
                  // ⚠️ isAnalyzingは編集モードの着手ブロックにはもう使わない
                  // (目のon/offに関わらず常に推論するようになったため、
                  //  推論中でも連打で次の手を打てる)。
                  disabled={!board.isEditMode}
                  isGameEnded={!board.isEditMode}
                  doubleTap={
                    board.boardSize === 9
                      ? board.doubleTap9
                      : board.boardSize === 13
                        ? board.doubleTap13
                        : board.boardSize === 19
                          ? board.doubleTap19
                          : false
                  }
                  // その他情報: 5
                  // forceShowTerritory={!!manualTerritory}
                  editMarkers={board.editMarkers}
                  candidatePoints={
                    board.showCandidatesPoints ? candidatePoints : []
                  } // 2026/09/21⚠️⚠️⚠️⚠️大事: ここで👁️のon offでの盤面表示を制御している
                  moveEvaluationPoint={
                    board.showMoveEvaluationPoint ? lastMoveGrid : null
                  } // 2026/09/21⚠️⚠️⚠️⚠️大事: ここで👁️のon offでの盤面表示を制御している
                  moveEvaluation={lastMoveEvaluation}
                  // 物理サイズ: 1
                  boardWidth={boardWidth}
                  // 色: 10
                  boardColor={colors.primary}
                  lineColor={colors.background}
                  blackStoneColor={colors.blackStone}
                  whiteStoneColor={colors.whiteStone}
                  humanMoveColor={colors.humanMoveColor}
                  botMoveColor={colors.botMoveColor}
                  goodMoveColor={colors.success}
                  badMoveColor={colors.failure}
                  // 音
                  sound={board.isSoundEnabled}
                  //
                  practiceMatchStatus={practiceMatchStatus}
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

          {/* ─── 余白 C ─── */}
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_C * widthRatio }} />

          {/* 📈 リプレイコントロール＆グラフ（一体型） */}

          <ScoreLeadReplayControls
            showMode={board.showMode}
            analysis={board.combinedAnalysis}
            currentIndex={board.currentIndex}
            totalMoves={board.processed.moves.length}
            onCurrentIndexChange={board.setCurrentIndex}
            backgroundStrong={colors.backgroundStrong}
            foreground={colors.foreground}
            primaryStrong={colors.primaryStrong}
            fontFamily={fontFamily}
          />

          {/* ─── 余白 D ─── */}
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_D * heightRatio }} />
        </View>
      </View>
    </SafeAreaView>
  );
};
