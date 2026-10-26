// BoardEditScreen.tsx

import {
  BoardEditScreenHeader,
  HeaderPlayerInfo,
} from "@/src/components/headers/BoardEditScreenHeader";
import { GameResultModal } from "@/src/components/modals/game/result/GameResultModal";
import { BoardEditScreenSettingsModal } from "@/src/components/modals/game/settings/BoardEditScreenSettingsModal";
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
} from "@expo/vector-icons";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  GoBoard,
  ReplayTapOverlay,
  ScoreLeadReplayControls,
} from "go-components";
import { BLACK, RecordAnalysis, WHITE } from "go-core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DotAnimation,
  IconButton,
  MyHeader,
  SegmentedIconControl,
} from "ui-atoms";
import { MyText } from "../components/common/MyText";
import { useBlurActiveElement } from "../hooks/common/useBlurActiveElement";
import { useTranslation } from "../i18n/LangProvider";
import { fetchRecordAnalysis, submitAnalysis } from "../logics/rpc/recordsRPC";
import { FromType } from "../types/from";

// ─── レイアウト定数 ───
const LAYOUT_CONFIG = {
  // 余白の比率（flex）を設定する
  // A: ヘッダーとカードの間
  // B: 碁盤とリプレイコントロールの間
  // C: リプレイコントロールの下
  FLEX_A: 1,
  FLEX_B: 1,
  FLEX_C: 1,
};

export default function BoardEditScreen() {
  const colors = useColors();
  const t = useTranslation();

  // 🐱 matchId と initialRecord の両方を受け取れるようにする
  const {
    recordParam,
    from,
    resultComment,
    rankIndexBefore,
    rankIndexAfter,
    ratingBefore,
    ratingAfter,
    practiceMatchStatus,
    giantKillingStreak,
    whiteRotation,
  } = useLocalSearchParams<{
    recordParam?: string;
    from: FromType;
    resultComment?: string;
    rankIndexBefore?: string;
    rankIndexAfter?: string;
    ratingBefore?: string;
    ratingAfter?: string;
    practiceMatchStatus?: string;
    giantKillingStreak?: string;
    whiteRotation?: string;
  }>();

  // 棋譜の本体(JSON文字列)をパラメータでもらって、パースして使う。
  // 持っている値から作れるので、stateではなくuseMemoにする
  const record = useMemo<RecordType | null>(() => {
    if (!recordParam) return null;
    try {
      return JSON.parse(recordParam) as RecordType;
    } catch (e) {
      console.error("Failed to parse record:", e);
      return null;
    }
  }, [recordParam]);

  // 一覧から開いた棋譜は分析を持っていないので、サーバーから取ってくる。
  // (対局直後の棋譜は、アプリの中で分析を持っているので、取らない)
  const recordId = record?.id;
  const needsFetch =
    !!record && record.analysis === null && from === "RecordScreen";
  const [fetched, setFetched] = useState<{
    id: string;
    analysis: RecordAnalysis | null;
  } | null>(null);
  // サーバーに、この対局そのものが無かったとき true(→ホームへ戻す)
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!recordId || !needsFetch) return;
    let cancelled = false;
    fetchRecordAnalysis(
      recordId,
      record.moves,
      record.board_size,
      record.match_type,
      record.result,
    )
      .then((result) => {
        if (cancelled) return;
        if (result === "not_found") {
          setNotFound(true);
          return;
        }
        setFetched({ id: recordId, analysis: result });
      })
      .catch((e) => {
        // 取れなかった場合も「分析なし」として扱い、アプリ内で分析する流れに進める
        console.error("Failed to fetch record analysis:", e);
        if (!cancelled) setFetched({ id: recordId, analysis: null });
      });
    return () => {
      cancelled = true;
    };
  }, [recordId, needsFetch]);

  // 分析をくっつけた棋譜。持っている値から作れるので useMemo
  const recordWithAnalysis = useMemo<RecordType | null>(() => {
    if (!record) return null;
    if (!needsFetch) return record;
    return { ...record, analysis: fetched?.analysis ?? null };
  }, [record, needsFetch, fetched]);

  useBlurActiveElement();

  // 棋譜がない(パラメータがない / 途中で切れている)、または、サーバーに対局が無いときは、ホームへ戻す
  if (!record || notFound) {
    return <Redirect href="/HomeScreen" />;
  }

  // 分析の取得待ちの間は、ローディング画面
  const waiting = needsFetch && fetched?.id !== recordId;
  if (!recordWithAnalysis || waiting) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="small" color={colors.primary} />
        <MyText className="mt-4 text-textSub">
          <DotAnimation text={t("common.loading")} />
        </MyText>
      </SafeAreaView>
    );
  }

  // 一覧から開いたのに、サーバーに分析が無かった(まれ)。
  // アプリで最後まで分析して、サーバーへ出してから、開く。
  if (
    record &&
    needsFetch &&
    fetched?.analysis === null &&
    (record.moves?.length ?? 0) > 0
  ) {
    return (
      <AnalysisFiller
        record={record}
        onDone={(analysis) => setFetched({ id: record.id, analysis })}
      />
    );
  }

  return (
    <BoardEditScreenContent
      record={recordWithAnalysis}
      from={from}
      resultComment={resultComment}
      rankIndexBefore={Number(rankIndexBefore)}
      rankIndexAfter={Number(rankIndexAfter)}
      ratingBefore={Number(ratingBefore)}
      ratingAfter={Number(ratingAfter)}
      practiceMatchStatus={practiceMatchStatus ?? ""}
      // 空文字・なし → null(連勝が変わらなかった)。"0" はちゃんと 0 になる
      giantKillingStreak={
        giantKillingStreak ? Number(giantKillingStreak) : null
      }
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
  giantKillingStreak: number | null;
  whiteRotation: string | undefined;
}) => {
  const fontFamily = useAppFont();
  const colors = useColors();
  const { show, hide } = useOverlay();
  const { width, height } = useWindowDimensions();
  const heightRatio = height / width;
  const widthRatio = width / height;

  const { uid } = useProfile();

  // 🐱 棋譜モード専用：手ごとのKataGo解析を進める・止める
  const analysisLoop = useRecordAnalysisLoop(record);

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
    // handleShowTerritory,
    handleBotSuggest,
    isBotSuggesting,
    isAnyProcessing,
    // setShownTerritoryKey,
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

  // 🐱 地の見込みは、useBoardEditActionsのterritoryResult(分析の ownership が元)だけを
  //    見る。確定した最終局面でも、それ以外の局面でも、同じ窓口から取る。
  const currentOwnership = territoryResult?.ownership ?? null;

  // 🐱 棋譜モードで、一番最後の局面を見ている時。
  //    連続パスで終わっているかどうかは問わない。
  const isAtLastPosition =
    !board.isEditMode && board.currentIndex === board.maxIdx;
  // 🐱 盤面に出す地。最後の局面では問答無用で常に、それ以外ではバッジをタップした時か、
  //    設定(showOwnership)がonの時だけ出す。
  const ownershipToShow =
    isAtLastPosition || !!manualTerritory || board.showOwnership
      ? currentOwnership
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
        <MyHeader
          left={
            <View className="flex-row items-center gap-4">
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
                      pos: board.combinedAnalysis.pos.slice(
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

          <View className="w-full items-center pb-2">
            <View
              style={{
                width: boardWidth,
              }}
            >
              <BoardEditScreenHeader
                analysis={board.combinedAnalysis}
                leftPlayer={leftPlayer}
                rightPlayer={rightPlayer}
                currentIndex={board.currentIndex}
                showWinRateBar={board.showWinRateBar}
              />
            </View>
          </View>

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
                  board={
                    board.processed.boardHistory[board.currentIndex] ??
                    board.processed.boardHistory[0] ??
                    {}
                  }
                  currentIndex={board.currentIndex}
                  ownership={ownershipToShow}
                  forceShowTerritory={!!ownershipToShow}
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
                  doubleTap={board.doubleTap}
                  // その他情報: 5
                  editMarkers={board.editMarkers}
                  candidatePoints={
                    board.showMoveEvaluation ? candidatePoints : []
                  } // 2026/09/21⚠️⚠️⚠️⚠️大事: ここで👁️のon offでの盤面表示を制御している
                  moveEvaluationPoint={
                    board.showMoveEvaluation ? lastMoveGrid : null
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
          <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_B * widthRatio }} />

          {/* 📈 リプレイコントロール＆グラフ（一体型） */}

          {/* コントロールエリア */}
          <View className="w-full items-center">
            <View
              style={{
                width: boardWidth,
              }}
            >
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
            </View>
          </View>

          {/* ─── 余白 D ─── ⚠️minHeghtはReplayControlのBubbleのため。*/}
          <View
            style={{
              flexGrow: LAYOUT_CONFIG.FLEX_C * heightRatio,
              minHeight: 20,
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

// 一覧から開いたのに、サーバーに分析が無かったとき(まれ)の、分析中の画面。
// 最後まで分析できたら、サーバーへ出して、開く。途中で止まったら、あるぶんだけで開く。
const AnalysisFiller = ({
  record,
  onDone,
}: {
  record: RecordType;
  onDone: (analysis: RecordAnalysis) => void;
}) => {
  const t = useTranslation();

  const colors = useColors();
  const loop = useRecordAnalysisLoop(record);
  const startedRef = useRef(false);
  const sawRunningRef = useRef(false);
  const doneRef = useRef(false);

  // エンジンの準備ができたら、自動で分析を始める
  useEffect(() => {
    if (!loop.engineReady || startedRef.current) return;
    startedRef.current = true;
    loop.toggleAnalysis();
  }, [loop.engineReady]);

  // 分析が止まったら(全部そろった / 途中で失敗した)、いまある分析を渡して、開く。
  // そろっていれば、submitAnalysis がサーバーへ出してくれる(そろっていなければ、何もしない)。
  useEffect(() => {
    if (loop.isAnalyzing) {
      sawRunningRef.current = true;
      return;
    }
    if (!sawRunningRef.current || doneRef.current) return;
    doneRef.current = true;
    submitAnalysis(record.id, loop.analysis, loop.totalMoves + 1);
    onDone(loop.analysis);
  }, [loop.isAnalyzing]);

  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center">
      <ActivityIndicator size="small" color={colors.primary} />
      <MyText className="mt-4 text-textSub">
        <DotAnimation text={t("common.analyzing")} />
        {` ${loop.analyzedCount} / ${loop.totalMoves}`}
      </MyText>
    </SafeAreaView>
  );
};
