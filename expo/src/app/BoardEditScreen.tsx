// app/BoardEditScreen.tsx
import {
  BoardEditScreenHeader,
  HeaderPlayerInfo,
} from "@/src/active/components/headers/BoardEditScreenHeader";

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useBotAnalysis } from "@/src/active/hooks/bot/useBotAnalysis";
import { useBoardEditActions } from "@/src/active/hooks/edit/useBoardEditActions";
import { useEditableGoBoard } from "@/src/active/hooks/edit/useEditableGoBoard";
import { useReplayMoveEvaluation } from "@/src/active/hooks/edit/useReplayMoveEvaluation";
import { RecordType } from "@/src/active/types/record";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  GoBoard,
  ReplayTapOverlay,
  ScoreLeadReplayControls,
} from "go-components";
import { BLACK, ownershipToTerritoryBoard, WHITE } from "go-core";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, SegmentedIconControl } from "ui-atoms";
import { TerritoryResultBadge } from "../active/components/buttons/TerritoryResultBadge";

import { useOverlay } from "../active/contexts/OverlayContext";
import { useColors } from "../active/hooks/useTheme";
import { FromType } from "../active/types/from";
import { recordsRepo } from "../stable/logics/records-repo";
import { subscribeToRecordsChange } from "../stable/logics/records-repo/records-repo-events";
import { AnalyzeDisplaySettingsModal } from "../active/modals/AnalyzeDisplaySettingsModal";
import { GameResultModal } from "../active/modals/gameresult/GameResultModal";

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
  }>();

  const colors = useColors();

  const [record, setRecord] = useState<RecordType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ⚠️⚠️⚠️謎のエラーを防ぐための部分なので消さない。これがないとBlocked aria-hidden...とか言われる
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

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
        if (matchId) {
          const targetId = Number(matchId);
          if (!isNaN(targetId)) {
            const data = await recordsRepo.getById(targetId);
            if (isMounted) setRecord(data);
          }
        }
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
  useEffect(() => {
    if (!matchId) return;
    const targetId = Number(matchId);
    if (isNaN(targetId)) return;

    return subscribeToRecordsChange(() => {
      recordsRepo.getById(targetId).then((data) => {
        if (data) setRecord(data);
      });
    });
  }, [matchId]);

  if (isLoading || !record) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        {/* <ActivityIndicator size="large" color={colors.primary} />
        <AppText className="text-text mt-2">{t("common.loading")}...</AppText> */}
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
      giantKillingBonus={Boolean(giantKillingBonus)}
    />
  );
}

function BoardEditScreenContent({
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
}) {
  const colors = useColors();
  const { show, hide } = useOverlay();
  const { width, height } = useWindowDimensions();
  const heightRatio = height / width;
  const widthRatio = width / height;

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

  // 🐱 ボット思考ボタンの処理と、地計算の結果・盤面への地表示
  const {
    territoryResult,
    manualTerritory,
    handleShowTerritory,
    handleBotSuggest,
    isBotSuggesting,
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

  const ownership = useMemo(
    () => board.combinedAnalysis?.perMove[board.currentIndex]?.ownership,
    [board.combinedAnalysis, board.currentIndex],
  );

  const ownershipTerritoryBoard = useMemo(() => {
    if (!ownership) return null;
    const currentBoard =
      board.processed.boardHistory[board.currentIndex] ??
      board.processed.boardHistory[0];
    if (!currentBoard) return null;
    return ownershipToTerritoryBoard(board.boardSize, currentBoard, ownership);
  }, [
    ownership,
    board.processed.boardHistory,
    board.currentIndex,
    board.boardSize,
  ]);

  // 🐱 board.processed.territoryBoardは「終局した最終局面」専用のデータ(record.dead_stones由来)。
  //    今まさにその最終局面(棋譜モードで、かつ一番最後の手)を見ている時だけ、
  //    これを最優先で使う。それ以外の局面では、たとえownershipトグルがonでも
  //    このデータは無関係(別の局面のデータ)なので絶対に使ってはいけない。
  const isAtConfirmedFinalPosition =
    !board.isEditMode &&
    board.currentIndex === board.maxIdx &&
    !!record.dead_stones;

  const isUserBlack = record.black_uid === uid;
  const isUserWhite = record.white_uid === uid;
  const isUserParticipant = isUserBlack || isUserWhite; // 🔥自分が対局者として実在するか
  const isMyBlack = isUserBlack; // 互換のため名称は維持(黒番かどうかの判定に使用)

  const blackWins = record.result?.startsWith("B")
    ? true
    : record.result?.startsWith("W")
      ? false
      : undefined;
  const playerWin =
    blackWins === undefined || !isUserParticipant
      ? undefined
      : isMyBlack
        ? blackWins
        : !blackWins;

  const boardWidth = width > height - 210 ? height * 0.7 : width * 0.96;

  const { iconIndex, username } = useProfile();
  // プレイヤーと対戦相手の情報をまとめる(自分が対局者である場合のみ使用)
  const playerColor = isMyBlack ? BLACK : WHITE;
  const playerRankIndex = isMyBlack
    ? recordForHeader.black_rank_index
    : recordForHeader.white_rank_index;
  const playerAgehama = isMyBlack
    ? board.currentAgehama.black
    : board.currentAgehama.white;
  const playerPass = isMyBlack ? board.isBlackPass : board.isWhitePass;

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
        username:
          practiceMatchStatus === "human_human" ? "you" : (username ?? "user"),
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

      <View className="flex-1 w-full max-w-160 mx-auto">
        {/* ヘッダー */}
        <View className="flex-row justify-between items-center px-5 py-3">
          {/* 🐱 左側：戻るボタン or 再対局ボタン */}
          <View className="flex-row items-center gap-4">
            {/* 戻るボタン */}
            {from === "RecordScreen" && (
              <TouchableOpacity
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
                <Feather name="chevron-left" size={36} color={colors.textSub} />
              </TouchableOpacity>
            )}

            {/* メニューボタン */}
            {from !== "RecordScreen" && (
              <TouchableOpacity
                onPress={() => {
                  show(
                    <GameResultModal
                      boardSize={board.boardSize}
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
                    />,
                  );
                }}
                activeOpacity={0.7}
              >
                <Feather name="menu" size={32} color={colors.primaryStrong} />
              </TouchableOpacity>
            )}
          </View>

          {/* 🐱 右側：機能アイコン群（分析・編集・モード切り替え） */}
          <View className="flex-row items-center gap-2">
            {/* 分析📈ボタン */}
            {!board.isEditMode &&
              !isFullyAnalyzed &&
              board.processed.moves.length >= 1 && (
                <IconButton
                  icon={
                    botAnalysis.isAnalyzing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Octicons name="graph" />
                    )
                  }
                  iconColor={colors.primary}
                  backgroundColor={colors.foreground}
                  borderColor={colors.backgroundStrong}
                  onPress={botAnalysis.toggleAnalysis}
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

            {/* 地計算🧮の結果バッジ。計算中はくるくる、結果なしなら何も出ない。
                背景 primary = 未確定 / primaryStrong = 確定。タップで盤面に地を表示 */}
            {board.showTerritoryResultBadge && (
              <TerritoryResultBadge
                isCalculating={
                  !territoryResult &&
                  (board.isAnalyzing || botAnalysis.isAnalyzing)
                }
                result={territoryResult}
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
                if (botAnalysis.isAnalyzing) botAnalysis.requestStop();
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
            {board.analysisComponentsLoaded && (
              <IconButton
                icon={<FontAwesome6 name={"gear"} />}
                iconColor={colors.primary}
                backgroundColor={colors.foreground}
                borderColor={colors.backgroundStrong}
                onPress={() => {
                  show(<AnalyzeDisplaySettingsModal onClose={hide} />);
                }}
              />
            )}
          </View>
        </View>

        {/* コンテンツ領域 */}

        <View className="flex-1 px-2">
          {/* ─── 余白 a ─── */}
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_A }} />

          <BoardEditScreenHeader
            record={recordForHeader}
            leftPlayer={leftPlayer}
            rightPlayer={rightPlayer}
            playerWin={playerWin}
            matchType={record.match_type}
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
                }}
              >
                <GoBoard
                  // 盤面サイズ: 1
                  boardSize={board.boardSize}
                  matchType={record.match_type}
                  // プレイヤの色: 1
                  playerColor={isMyBlack ? BLACK : WHITE}
                  // 現在の盤面、インデックス、テリトリーボード: 3
                  board={
                    board.processed.boardHistory[board.currentIndex] ??
                    board.processed.boardHistory[0] ??
                    {}
                  }
                  currentIndex={board.currentIndex}
                  territoryBoard={
                    isAtConfirmedFinalPosition &&
                    !board.processed.territoryBoard.every(
                      (row) => row.every((cell) => cell === 0), // territoryboardがあると言いながら、中身が全部0ならそれはノーカウント
                    )
                      ? board.processed.territoryBoard
                      : (manualTerritory?.territoryBoard ??
                        (board.showOwnershipTerritoryBoard
                          ? ownershipTerritoryBoard
                          : null) ??
                        board.processed.territoryBoard)
                  }
                  forceShowTerritory={
                    !isAtConfirmedFinalPosition &&
                    (!!manualTerritory ||
                      (board.showOwnershipTerritoryBoard &&
                        !!ownershipTerritoryBoard))
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
            showScoreLeadGraph={board.showScoreLeadGraph}
            analysis={board.combinedAnalysis}
            currentIndex={board.currentIndex}
            totalMoves={board.processed.moves.length}
            onCurrentIndexChange={board.setCurrentIndex}
            primary={colors.primary}
            background={colors.background}
            backgroundStrong={colors.backgroundStrong}
            foreground={colors.foreground}
            primaryStrong={colors.primaryStrong}
          />

          {/* ─── 余白 D ─── */}
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_D * heightRatio }} />
        </View>
      </View>
    </SafeAreaView>
  );
}
