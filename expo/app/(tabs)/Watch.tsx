// Watch.tsx
// お約束
import { GhostCard } from "@/src/components/Cards/GhostCard";
import { SkeletonCard } from "@/src/components/Cards/SkeletonCard";
import { AgehamaDisplay } from "@/src/components/GoComponents/Agehama";
import { AvatarWithPass } from "@/src/components/GoComponents/AvatarWithPass";
import { GoBoard } from "@/src/components/GoComponents/GoBoard";
import { ReplayControls } from "@/src/components/GoComponents/ReplayControls";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { Agehama } from "@/src/constants/goConstants";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { PlanIdContext } from "@/src/contexts/UserContexts";
import {
  applyMove,
  Board,
  cloneBoard,
  Color,
  initializeBoard,
  stringifyGrid,
  stringToGrid,
} from "@/src/lib/goLogics";
import {
  intArrayToStringArray,
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToComment,
  secondsToMinutes,
} from "@/src/lib/goUtils";
import { SetState, wrapBotDisplayname } from "@/src/lib/utils";
import { supabase } from "@/src/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── 定数 ─────────────────────────────────────────────
const FREE_PLAN_LIMIT = 10; // 無料ユーザは10局まで観戦可能

// ─── 型定義 ────────────────────────────────────────────
// Supabaseからそのまま取得する「対局情報そのもの」。対局の生データのイメージ
type WatchMatch = {
  id: number; // matchId
  status?: string; // playingか、finishedか
  moves?: number[]; //
  result?: string;
  turn?: string;
  black_seconds?: number;
  white_seconds?: number;
  black_points?: number;
  white_points?: number;
  dead_stones?: number[];
  black_icon_index?: number;
  white_icon_index?: number;
  match_type?: number;
  black_displayname?: string;
  white_displayname?: string;
  black_gumi_index?: number;
  white_gumi_index?: number;
};

// カードの状態。
// null=ロード中, MatchCardData=表示可能
type CardState = null | WatchCardData;

// WatchMatchを整形して、カードで表示しやすくしたもの
// WatchMatchに対して、こちらは画面表示用に加工済みのデータ
type WatchCardData = {
  id: number;
  moves: string[];
  boardHistory: Board[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][];
  isFinished: boolean;
  match: WatchMatch;
  status?: string; // playingか、finishedか
  turn?: string;
  black_seconds?: number;
  white_seconds?: number;
  black_points?: number;
  white_points?: number;
  dead_stones?: number[];
  black_icon_index?: number;
  white_icon_index?: number;
  match_type?: number;
  black_displayname?: string;
  white_displayname?: string;
  black_gumi_index?: number;
  white_gumi_index?: number;
};

// WatchMatch(生データ)を元に、WatchCardData(画面表示用に加工済みのデータ)を作る関数
const buildCardData = (match: WatchMatch): WatchCardData => {
  const moves = intArrayToStringArray(match.moves ?? []);
  const matchType = match.match_type ?? 0;
  const { boardHistory, agehamaHistory } = movesToBoardHistory(
    9,
    matchType,
    moves,
  );
  let territoryBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
  const isFinished = match.status === "finished" && !!match.result;
  if (isFinished && match.result) {
    const suffix = match.result[2];
    if (suffix !== "R" && suffix !== "T" && suffix !== "C") {
      const deadStones = intArrayToStringArray(match.dead_stones ?? []);
      const lastBoard = boardHistory[boardHistory.length - 1];
      const lastAgehama = agehamaHistory[agehamaHistory.length - 1];
      if (lastBoard) {
        territoryBoard = makeTerritoryBoard(
          9,
          lastBoard,
          deadStones,
          matchType,
          lastAgehama.black,
          lastAgehama.white,
        ).territoryBoard;
      }
    }
  }
  return {
    id: match.id,
    match,
    moves,
    boardHistory,
    agehamaHistory,
    territoryBoard,
    isFinished,
    black_seconds: match.black_seconds,
    white_seconds: match.white_seconds,
    black_points: match.black_seconds,
    white_points: match.white_points,
    dead_stones: match.dead_stones,
    black_icon_index: match.black_icon_index,
    white_icon_index: match.white_icon_index,
    match_type: match.match_type,
    black_displayname: match.black_displayname,
    white_displayname: match.white_displayname,
    black_gumi_index: match.black_gumi_index,
    white_gumi_index: match.white_gumi_index,
  };
};

// WatchCard本体。
const WatchCard = React.memo(
  ({
    data, // 表示用の加工済みデータ
    t, // 翻訳機
    cardHeight, // 高さ
    boardWidth, // 碁盤サイズ
    onMove, // 手が来るたび盤面や履歴を更新する関数
    onFinished, // 終局データが来たら盤面のテリトリーとか状態を更新する関数
  }: {
    data: WatchCardData;
    t: any;
    cardHeight: number;
    boardWidth: number;
    onMove: (handler: (payload: any) => void) => void;
    onFinished: (handler: (payload: any) => void) => void;
  }) => {
    const matchType = data.match.match_type ?? 0;

    const [boardHistory, setBoardHistory] = useState<Board[]>(
      data.boardHistory,
    );
    const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>(
      data.agehamaHistory,
    );
    const [territoryBoard, setTerritoryBoard] = useState<number[][]>(
      data.territoryBoard,
    );
    const [moves, setMoves] = useState<string[]>(data.moves);
    const [status, setStatus] = useState(data.match.status);
    const [result, setResult] = useState(data.match.result);
    const [isFinished, setIsFinished] = useState(data.isFinished);
    const [currentIndex, setCurrentIndex] = useState(
      data.boardHistory.length - 1,
    );

    const boardHistoryRef = useRef<Board[]>(data.boardHistory);
    const agehamaHistoryRef = useRef<Agehama[]>(data.agehamaHistory);
    const movesRef = useRef<string[]>(data.moves);
    const isAtLatestRef = useRef(true); // 観戦者が今最新の手を見ているかどうか

    // ─── 時間・手番 State ─────────────────────────────────
    const [blackSeconds, setBlackSeconds] = useState(Number(180));
    const [whiteSeconds, setWhiteSeconds] = useState(Number(180));
    const turnRef = useRef<"black" | "white">("black");
    const blackSecondsRef = useRef(180);
    const whiteSecondsRef = useRef(180);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // currentIndex を更新するときに 「最新手かどうか」を自動でチェックして反映する関数
    // 要はsetCurrentIndexだと考えればok
    const wrappedSetCurrentIndex: SetState<number> = useCallback((value) => {
      setCurrentIndex((prev) => {
        // valueが関数ならprevをそれに適用してnextに格納する、valueが変数ならそのままnextに格納する
        // 要はnextは新しいstate
        const next = typeof value === "function" ? value(prev) : value;
        // 一番最新の手を見ているかどうか
        isAtLatestRef.current = next === boardHistoryRef.current.length - 1;
        return next;
      });
    }, []);

    // moveハンドラをonMoveで登録
    useEffect(() => {
      onMove((payload: any) => {
        if (isFinished) return;
        const payloadData = payload.payload ?? payload;
        blackSecondsRef.current = payloadData.black_seconds;
        setBlackSeconds(blackSecondsRef.current);
        whiteSecondsRef.current = payloadData.white_seconds;
        setWhiteSeconds(whiteSecondsRef.current);
        turnRef.current = payloadData.turn;
        const moveRaw: number = payloadData.move;
        const moveCount: number = payloadData.move_count;
        const move = intArrayToStringArray([moveRaw])[0];
        if (moveCount !== movesRef.current.length + 1) return;
        const colors: Color[] =
          matchType >= 2 ? ["white", "black"] : ["black", "white"];
        const moverColor: Color = colors[(moveCount - 1) % 2];
        const lastBoard =
          boardHistoryRef.current[boardHistoryRef.current.length - 1];
        if (move === "p") {
          const newBoardHistory = [
            ...boardHistoryRef.current,
            cloneBoard(lastBoard),
          ];
          const lastAgehama =
            agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
          const newAgehamaHistory = [
            ...agehamaHistoryRef.current,
            { ...lastAgehama },
          ];
          const newMoves = [...movesRef.current, "p"];
          boardHistoryRef.current = newBoardHistory;
          agehamaHistoryRef.current = newAgehamaHistory;
          movesRef.current = newMoves;
          setBoardHistory(newBoardHistory);
          setAgehamaHistory(newAgehamaHistory);
          setMoves(newMoves);
        } else {
          const grid = stringToGrid(move);
          const { board: newBoard, agehama } = applyMove(
            9,
            grid,
            cloneBoard(lastBoard),
            moverColor,
          );
          const newBoardHistory = [...boardHistoryRef.current, newBoard];
          const lastAgehama =
            agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
          const newAgehamaHistory = [
            ...agehamaHistoryRef.current,
            moverColor === "black"
              ? { ...lastAgehama, black: lastAgehama.black + agehama }
              : { ...lastAgehama, white: lastAgehama.white + agehama },
          ];
          const newMoves = [...movesRef.current, stringifyGrid(grid)];
          boardHistoryRef.current = newBoardHistory;
          agehamaHistoryRef.current = newAgehamaHistory;
          movesRef.current = newMoves;
          setBoardHistory(newBoardHistory);
          setAgehamaHistory(newAgehamaHistory);
          setMoves(newMoves);
        }
        if (isAtLatestRef.current)
          setCurrentIndex(boardHistoryRef.current.length - 1);
      });
    }, [onMove, isFinished, matchType]);

    // finishedハンドラをonFinishedで登録
    useEffect(() => {
      onFinished((payload: any) => {
        const d = payload.payload ?? payload;
        const resultStr: string = d.result;
        const suffix = resultStr[2];
        const deadStones = intArrayToStringArray(d.dead_stones ?? []);
        if (suffix !== "R" && suffix !== "T" && suffix !== "C") {
          const lastBoard =
            boardHistoryRef.current[boardHistoryRef.current.length - 1];
          const la =
            agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
          if (lastBoard) {
            setTerritoryBoard(
              makeTerritoryBoard(
                9,
                lastBoard,
                deadStones,
                matchType,
                la.black,
                la.white,
              ).territoryBoard,
            );
          }
        }
        setResult(resultStr);
        setStatus("finished");
        setIsFinished(true);
        if (isAtLatestRef.current)
          setCurrentIndex(boardHistoryRef.current.length - 1);
      });
    }, [onFinished, matchType]);

    // タイマー開始
    useEffect(() => {
      timerRef.current = setInterval(() => {
        if (isFinished) return;

        if (turnRef.current === "black") {
          blackSecondsRef.current = Math.max(0, blackSecondsRef.current - 1);
          setBlackSeconds(blackSecondsRef.current);
          return;
        }

        whiteSecondsRef.current = Math.max(0, whiteSecondsRef.current - 1);
        setWhiteSeconds(whiteSecondsRef.current);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isFinished]);

    const board = boardHistory[currentIndex] ?? initializeBoard(9);

    const moveHistory = moves?.slice(0, currentIndex + 1) ?? [];
    const currentMove = moveHistory[currentIndex - 1];
    const isCurrentMovePass = currentMove === "p";
    const isBlackPass =
      isCurrentMovePass &&
      ((currentIndex % 2 === 1 && (matchType === 0 || matchType === 1)) ||
        (currentIndex % 2 === 0 && matchType !== 0 && matchType !== 1));
    const isWhitePass =
      isCurrentMovePass &&
      ((currentIndex % 2 === 0 && (matchType === 0 || matchType === 1)) ||
        (currentIndex % 2 === 1 && matchType !== 0 && matchType !== 1));

    return (
      <View style={[styles.card, { height: cardHeight }]}>
        <View style={styles.matchHeader}>
          {/* ヘッダー */}
          <View style={[styles.playersRow]}>
            {/* 黒（左） */}
            <View style={styles.playerCell}>
              <View style={styles.playerMain}>
                <AvatarWithPass
                  gumiIndex={data.black_gumi_index ?? 0}
                  iconIndex={data.black_icon_index ?? 0}
                  size={48}
                  color="black"
                  isLeft={true}
                  showPass={isBlackPass}
                />
                <View style={styles.playerInfo}>
                  <Text
                    style={[styles.playerName]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {wrapBotDisplayname(data.black_displayname ?? "", t)}
                  </Text>
                  <AgehamaDisplay count={agehamaHistory[currentIndex].black} />
                  <Text style={styles.timeText}>
                    {secondsToMinutes(blackSeconds)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 中央メタスロット */}
            <View style={styles.metaSlot}>
              <View style={styles.centerBadgeArea}>
                {isFinished && result ? (
                  <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>
                      {resultToComment(result, t)}
                    </Text>
                  </View>
                ) : status === "playing" ? (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveText}>{t("common.playing")}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* 白（右） */}
            <View style={[styles.playerCell, styles.playerCellRight]}>
              <View style={[styles.playerMain, styles.playerMainRight]}>
                <AvatarWithPass
                  gumiIndex={data.white_gumi_index ?? 0}
                  iconIndex={data.white_icon_index ?? 0}
                  size={48}
                  color="white"
                  isLeft={false}
                  showPass={isWhitePass}
                />
                <View style={[styles.playerInfo, styles.playerInfoRight]}>
                  <Text
                    style={[
                      styles.playerName,
                      styles.playerNameRight,
                      { flexShrink: 1 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {wrapBotDisplayname(data.white_displayname ?? "", t)}
                  </Text>
                  <AgehamaDisplay count={agehamaHistory[currentIndex].white} />
                  <Text style={styles.timeText}>
                    {secondsToMinutes(whiteSeconds)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.boardWrapper}>
          <GoBoard
            matchType={matchType}
            agehamaHistory={agehamaHistory}
            board={board}
            onPutStone={() => {}}
            moveHistory={moves}
            disabled={true}
            territoryBoard={territoryBoard}
            isGameEnded={isFinished}
            boardHistory={boardHistory}
            currentIndex={currentIndex}
            boardWidth={boardWidth}
          />
        </View>
        <View style={[styles.controlsWrapper, { width: boardWidth * 1.2 }]}>
          <ReplayControls
            onCurrentIndexChange={wrappedSetCurrentIndex}
            currentIndex={currentIndex}
            maxIndex={boardHistory.length - 1}
          />
        </View>
      </View>
    );
  },
);

// ─── メインコンポーネント ───────────────────────────────
export default function Watch() {
  const { t } = useTranslation();
  const { planId } = useContext(PlanIdContext)!;
  const { height } = useWindowDimensions();
  const CARD_HEIGHT = height * 0.68;
  const SNAP_INTERVAL = CARD_HEIGHT + 18;
  const boardWidth = (CARD_HEIGHT * 50) / 100;
  const isFree = planId === 0;

  // 現在表示中のカード（1枚のみ管理）
  const [currentCard, setCurrentCard] = useState<CardState>(null);
  // 現在のindex
  const [activeIndex, setActiveIndex] = useState(0);
  // スクロール可否（サブスク・RPC待ち中はfalse）
  const [scrollEnabled, setScrollEnabled] = useState(false);
  // 対局が存在するか（0件なら空画面）
  const [hasMatches, setHasMatches] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  // 現在サブスク中のチャンネル（1つだけ）
  const channelRef = useRef<RealtimeChannel | null>(null);
  // moveイベントのハンドラ
  const moveHandlerRef = useRef<((payload: any) => void) | null>(null);
  // finishedイベントのハンドラ
  const finishedHandlerRef = useRef<((payload: any) => void) | null>(null);
  const activeIndexRef = useRef(0);
  const isLoadingCardRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupChannel();
    };
  }, []);

  useEffect(() => {
    if (planId !== null) loadCardAt(0, true);
  }, [planId]);

  // ─── チャンネルクリーンアップ ──────────────────────────
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    moveHandlerRef.current = null;
    finishedHandlerRef.current = null;
  }, []);

  // ─── MatchCardへのハンドラ登録コールバック ─────────────
  const registerMoveHandler = useCallback((handler: (payload: any) => void) => {
    moveHandlerRef.current = handler;
  }, []);

  const registerFinishedHandler = useCallback(
    (handler: (payload: any) => void) => {
      finishedHandlerRef.current = handler;
    },
    [],
  );

  // ─── 指定indexのカードを読み込む ──────────────────────
  // isInitial=trueのときはloading表示
  const loadCardAt = useCallback(
    async (requestedIndex: number, isInitial = false) => {
      if (isLoadingCardRef.current) return;
      isLoadingCardRef.current = true;

      if (isInitial) setLoading(true);

      // 無料ユーザーの上限チェック
      const clampedIndex = isFree
        ? Math.min(requestedIndex, FREE_PLAN_LIMIT - 1)
        : requestedIndex;

      // 前のチャンネルを解除
      cleanupChannel();
      // ロード中はスクロール不可・カードをクリア
      setScrollEnabled(false);
      setCurrentCard(null);

      // ① 検索段階: get_watch_match_id_at でindexとidを取得
      const { data: idData, error: idError } = await supabase
        .schema("game")
        .rpc("get_watch_match_id_at", { p_index: clampedIndex });

      if (!isMountedRef.current) {
        isLoadingCardRef.current = false;
        return;
      }

      if (idError || !idData || idData.length === 0) {
        // 対局が1件もない
        setHasMatches(false);
        setLoading(false);
        isLoadingCardRef.current = false;
        return;
      }

      setHasMatches(true);
      const { actual_index, id } = idData[0] as {
        actual_index: number;
        id: number;
      };

      // actual_indexが要求と違う場合は強制スクロール
      if (actual_index !== requestedIndex) {
        flatListRef.current?.scrollToIndex({
          index: actual_index,
          animated: true,
        });
      }
      activeIndexRef.current = actual_index;
      setActiveIndex(actual_index);

      // ② サブスク（完了まで待つ）
      await new Promise<void>((resolve) => {
        const ch = supabase
          .channel(`game:${id}`)
          .on("broadcast", { event: "move" }, (payload) => {
            if (!isMountedRef.current) return;
            moveHandlerRef.current?.(payload);
          })
          .on("broadcast", { event: "finished" }, (payload) => {
            if (!isMountedRef.current) return;
            finishedHandlerRef.current?.(payload);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") resolve();
          });
        channelRef.current = ch;
      });
      if (!isMountedRef.current) {
        isLoadingCardRef.current = false;
        return;
      }

      // ③ 実際にマッチを取ってくる: get_watch_match で棋譜取得
      const { data: matchData, error: matchError } = await supabase
        .schema("game")
        .rpc("get_watch_match", { p_match_id: id });

      if (!isMountedRef.current) {
        isLoadingCardRef.current = false;
        return;
      }

      if (matchError || !matchData || matchData.length === 0) {
        // 取得失敗（終局済みなど）→ 同じindexで再試行
        console.error(`[Watch] get_watch_match failed id=${id}`, matchError);
        isLoadingCardRef.current = false;
        loadCardAt(actual_index);
        return;
      }

      const cardData = buildCardData(matchData[0] as WatchMatch);
      setCurrentCard(cardData);
      // ロード完了 → スクロール可
      setScrollEnabled(true);
      setLoading(false);
      isLoadingCardRef.current = false;
    },
    [isFree, cleanupChannel],
  );

  // ─── FlatList用のdata ──────────────────────────────────
  type Slot = "prev" | "current" | "next";
  const listData: Slot[] = ["prev", "current", "next"];

  const renderItem = useCallback(
    ({ item }: { item: Slot }) => {
      if (item === "current") {
        if (currentCard === null) {
          return <SkeletonCard height={CARD_HEIGHT} />;
        }
        return (
          <WatchCard
            data={currentCard}
            t={t}
            cardHeight={CARD_HEIGHT}
            boardWidth={boardWidth}
            onMove={registerMoveHandler}
            onFinished={registerFinishedHandler}
          />
        );
      }
      // prev/next はスワイプ用の空スロット
      return <View style={{ height: CARD_HEIGHT }} />;
    },
    [
      currentCard,
      t,
      CARD_HEIGHT,
      boardWidth,
      registerMoveHandler,
      registerFinishedHandler,
    ],
  );

  // ─── スワイプ検知 ──────────────────────────────────────
  // FlatListは常にindex=1（current）を表示。
  // スワイプでindex=0(prev)かindex=2(next)に移動したら対応するindexのカードを読み込み、
  // FlatListをindex=1に戻す。
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length === 0) return;
      const slot: Slot = viewableItems[0].item;
      if (slot === "current") return;

      const direction = slot === "next" ? 1 : -1;
      let nextIndex = activeIndexRef.current + direction;

      // 無料ユーザー上限
      if (isFree && nextIndex >= FREE_PLAN_LIMIT) {
        // ゴーストへ進もうとした → currentに戻す
        flatListRef.current?.scrollToIndex({ index: 1, animated: false });
        return;
      }

      // 0未満には行けない
      if (nextIndex < 0) {
        // flatListRef.current?.scrollToIndex({ index: 1, animated: false });
        // return;
        nextIndex = 0;
      }

      // FlatListをcurrentに即戻し（ユーザーには見えない）
      flatListRef.current?.scrollToIndex({ index: 1, animated: false });

      loadCardAt(nextIndex);
    },
    [isFree, loadCardAt],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCardAt(0, true);
    if (isMountedRef.current) setRefreshing(false);
  }, [loadCardAt]);

  const keyExtractor = useCallback((item: Slot) => item, []);

  const isEmpty = hasMatches === false && !loading;
  const isFreeLimitReached = isFree && activeIndex >= FREE_PLAN_LIMIT - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require("@/assets/images/21.png")}
            style={styles.characterImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>{t("Watch.noMatches")}</Text>
          <Text style={styles.emptyHint}>{t("Watch.pushToRefreshHint")}</Text>
          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh-circle"
              size={64}
              color={refreshing ? CHOCOLATE_SUB : STRAWBERRY}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            pagingEnabled
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal={false}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            scrollEnabled={scrollEnabled}
            initialScrollIndex={1}
            getItemLayout={(_, i) => ({
              length: CARD_HEIGHT,
              offset: SNAP_INTERVAL * i,
              index: i,
            })}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
          />
          {/* 無料ユーザーが上限に達したらGhostCardをオーバーレイ */}
          {isFreeLimitReached && !scrollEnabled === false && (
            <GhostCard cardHeight={CARD_HEIGHT} t={t} />
          )}
        </>
      )}

      <LoadingModal text={t("common.loading")} visible={loading} />
    </SafeAreaView>
  );
}

// ===== 位置調整用定数 =====
const PASS_SLOT_HEIGHT = 28;
const PASS_OVERLAP = 10;
const PASS_SLOT_WIDTH = 40;
// ==========================
// ─── スタイル ───────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: CHOCOLATE,
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  emptyHint: { fontSize: 12, color: CHOCOLATE_SUB, letterSpacing: 0.5 },
  characterImage: { width: 80, height: 80, borderRadius: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(249,250,251,0.8)",
  },
  centerBadgeArea: { alignItems: "center", justifyContent: "center" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(72,187,120,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(72,187,120,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6fbd80",
    letterSpacing: 1.2,
  },
  resultContainer: {
    backgroundColor: "rgba(200,214,230,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resultText: {
    fontSize: 13,
    fontWeight: "600",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  boardWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafbfc",
  },
  controlsWrapper: { alignSelf: "center", paddingVertical: 8 },

  // ── プレイヤー行 ──
  playersRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },

  playerCell: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  playerCellRight: {
    alignItems: "flex-end",
  },

  passSlot: {
    height: PASS_SLOT_HEIGHT,
    marginBottom: -PASS_OVERLAP,
    justifyContent: "flex-end",
    width: PASS_SLOT_WIDTH, // ← 固定幅に変更
    zIndex: 1,
  },
  passSlotRight: {
    alignItems: "flex-end",
  },

  hidden: {
    opacity: 0,
  },

  playerMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playerMainRight: {
    flexDirection: "row-reverse",
  },
  playerInfo: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  playerInfoRight: {
    alignItems: "flex-end",
  },
  playerName: {
    fontSize: 13,
    fontWeight: "500",
  },
  playerNameRight: {
    textAlign: "right",
  },

  // ── 中央メタスロット ──
  metaSlot: {
    paddingTop: 12,
    width: 72,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  metaResult: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 15,
  },
  metaDate: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2d3748",
  },
});
