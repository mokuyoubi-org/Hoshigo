// Watch.tsx
import { GhostCard } from "@/src/components/Cards/GhostCard";
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
} from "@/src/lib/goUtils";
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
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── 定数 ─────────────────────────────────────────────
const FETCH_COUNT = 10;
const FREE_PLAN_LIMIT = 10;

// ─── 型定義 ────────────────────────────────────────────
type WatchMatch = {
  id: number;
  status?: string;
  moves?: number[];
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

type MatchCardData = {
  id: number;
  moves: string[];
  boardHistory: Board[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][];
  isFinished: boolean;
  match: WatchMatch;
};

// ─── buildCardData ──────────────────────────────────────
function buildCardData(match: WatchMatch): MatchCardData {
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
  };
}

// ─── PlaceholderCard ───────────────────────────────────
const PlaceholderCard = ({ cardHeight }: { cardHeight: number }) => (
  <View style={[styles.card, styles.placeholderCard, { height: cardHeight }]}>
    <View style={styles.cardAccentLine} />
    <View style={styles.placeholderContent}>
      <View style={styles.placeholderBadge} />
      <View style={styles.placeholderBoard} />
      <View style={styles.placeholderControls} />
    </View>
  </View>
);

// ─── MatchCard ─────────────────────────────────────────
const MatchCard = React.memo(
  ({
    data,
    t,
    cardHeight,
    boardWidth,
    onMove,
    onFinished,
    isActive,
  }: {
    data: MatchCardData;
    t: any;
    cardHeight: number;
    boardWidth: number;
    onMove: (matchId: number, handler: (payload: any) => void) => void;
    onFinished: (matchId: number, handler: (payload: any) => void) => void;
    isActive: boolean;
  }) => {
    const matchId = data.match.id;
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
    const isAtLatestRef = useRef(true);

    const wrappedSetCurrentIndex: React.Dispatch<React.SetStateAction<number>> =
      useCallback((value) => {
        setCurrentIndex((prev) => {
          const next = typeof value === "function" ? value(prev) : value;
          isAtLatestRef.current = next === boardHistoryRef.current.length - 1;
          return next;
        });
      }, []);

    const handleMove = useCallback(
      (payload: any) => {
        if (isFinished) return;
        const d = payload.payload ?? payload;
        const moveRaw: number = d.move;
        const moveCount: number = d.move_count;
        const move = intArrayToStringArray([moveRaw])[0];

        const isNewMove = moveCount === movesRef.current.length + 1;
        if (!isNewMove) return;

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

        if (isAtLatestRef.current) {
          setCurrentIndex(boardHistoryRef.current.length - 1);
          isAtLatestRef.current = true;
        }
      },
      [isFinished, matchType],
    );

    const handleFinished = useCallback(
      (payload: any) => {
        const d = payload.payload ?? payload;
        const resultStr: string = d.result;
        const suffix = resultStr[2];
        const deadStones = intArrayToStringArray(d.dead_stones ?? []);

        if (suffix !== "R" && suffix !== "T" && suffix !== "C") {
          const lastBoard =
            boardHistoryRef.current[boardHistoryRef.current.length - 1];
          const lastAgehama =
            agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
          if (lastBoard) {
            const tb = makeTerritoryBoard(
              9,
              lastBoard,
              deadStones,
              matchType,
              lastAgehama.black,
              lastAgehama.white,
            ).territoryBoard;
            setTerritoryBoard(tb);
          }
        }
        setResult(resultStr);
        setStatus("finished");
        setIsFinished(true);
        if (isAtLatestRef.current) {
          setCurrentIndex(boardHistoryRef.current.length - 1);
        }
      },
      [matchType],
    );

    useEffect(() => {
      if (!isActive) return;
      onMove(matchId, handleMove);
      onFinished(matchId, handleFinished);
    }, [isActive, matchId, handleMove, handleFinished, onMove, onFinished]);

    const board = boardHistory[currentIndex] ?? initializeBoard(9);

    return (
      <View style={[styles.card, { height: cardHeight }]}>
        <View style={styles.cardAccentLine} />
        <View style={styles.matchHeader}>
          <View style={styles.centerBadgeArea}>
            {isFinished && result ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>
                  {resultToComment(result, t)}
                </Text>
              </View>
            ) : status === "playing" ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t("Watch.playing")}</Text>
              </View>
            ) : null}
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
  const CARD_HEIGHT = height * 0.78;
  const SNAP_INTERVAL = CARD_HEIGHT + 18;
  const boardWidth = (height * 36) / 100;

  const isFree = planId === 0;

  // cards: number = プレースホルダー(ID), MatchCardData = 表示可能
  const [cards, setCards] = useState<(number | MatchCardData)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGhost, setShowGhost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  const channelsRef = useRef<Map<number, RealtimeChannel>>(new Map());
  const moveHandlersRef = useRef<Map<number, (payload: any) => void>>(
    new Map(),
  );
  const finishedHandlersRef = useRef<Map<number, (payload: any) => void>>(
    new Map(),
  );
  const activeIndexRef = useRef(0);
  const isFetchingRef = useRef(false);
  // cardsのrefコピー（コールバック内で最新を参照するため）
  const cardsRef = useRef<(number | MatchCardData)[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (planId !== null) initialFetch();
  }, [planId]);

  // cardsのstate更新と同時にrefも更新
  const updateCards = useCallback(
    (
      updater: (prev: (number | MatchCardData)[]) => (number | MatchCardData)[],
    ) => {
      setCards((prev) => {
        const next = updater(prev);
        cardsRef.current = next;
        return next;
      });
    },
    [],
  );

  // ─── ハンドラ登録 ──────────────────────────────────────
  const registerMoveHandler = useCallback(
    (matchId: number, handler: (payload: any) => void) => {
      moveHandlersRef.current.set(matchId, handler);
    },
    [],
  );

  const registerFinishedHandler = useCallback(
    (matchId: number, handler: (payload: any) => void) => {
      finishedHandlersRef.current.set(matchId, handler);
    },
    [],
  );

  // ─── 単体: サブスク完了 → RPC → カード差し替え ─────────
  const subscribeAndFetch = useCallback(
    async (matchId: number) => {
      if (!isMountedRef.current) return;
      if (channelsRef.current.has(matchId)) return;

      await new Promise<void>((resolve) => {
        const ch = supabase
          .channel(`game:${matchId}`)
          .on("broadcast", { event: "move" }, (payload) => {
            if (!isMountedRef.current) return;
            moveHandlersRef.current.get(matchId)?.(payload);
          })
          .on("broadcast", { event: "finished" }, (payload) => {
            if (!isMountedRef.current) return;
            finishedHandlersRef.current.get(matchId)?.(payload);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") resolve();
          });
        channelsRef.current.set(matchId, ch);
      });

      if (!isMountedRef.current) return;

      const { data, error } = await supabase
        .schema("game")
        .rpc("get_watch_match", { p_match_id: matchId });

      if (!isMountedRef.current) return;
      if (error || !data || data.length === 0) {
        console.error(`[Watch] get_watch_match failed id=${matchId}`, error);
        // 取得失敗したIDはリストから除去
        updateCards((prev) => prev.filter((c) => c !== matchId));
        return;
      }

      const cardData = buildCardData(data[0] as WatchMatch);
      updateCards((prev) => prev.map((c) => (c === matchId ? cardData : c)));
    },
    [updateCards],
  );

  // ─── IDフェッチ → プレースホルダー追加 → サブスク&RPC ──
  // offset指定で先読み。取得結果を元にcardsを更新し、
  // 必要なら強制スクロールを行う。
  const fetchFromIndex = useCallback(
    async (offset: number) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const { data, error } = await supabase
        .schema("game")
        .rpc("get_watch_match_ids", {
          p_limit: FETCH_COUNT,
          p_offset: offset,
        });

      if (!isMountedRef.current) {
        isFetchingRef.current = false;
        return;
      }
      if (error) {
        console.error("[Watch] get_watch_match_ids error", error);
        isFetchingRef.current = false;
        return;
      }

      const ids: number[] = (data ?? []).map((row: { id: number }) => row.id);

      // offset=0 から取得した結果でcardsを再構築
      // （対局が増減している可能性があるので、offset以降は常に最新IDで上書き）
      updateCards((prev) => {
        // offset以前のカードはそのまま保持
        const before = prev.slice(0, offset);

        // offset以降: 新しいIDリストに合わせて更新
        // 既存のMatchCardDataはidが一致すれば再利用、なければプレースホルダー
        const existingMap = new Map<number, MatchCardData>();
        prev.forEach((c) => {
          if (typeof c !== "number") existingMap.set(c.id, c);
        });

        const after = ids.map((id) => existingMap.get(id) ?? id);
        return [...before, ...after];
      });

      // 無料ユーザー: offset+ids.length >= FREE_PLAN_LIMIT ならゴースト準備
      if (isFree) {
        setShowGhost(offset + ids.length >= FREE_PLAN_LIMIT);
      }

      isFetchingRef.current = false;

      // 新規IDのみサブスク&フェッチ
      ids.forEach((id) => subscribeAndFetch(id));

      // ─── 強制スクロール判定 ────────────────────────────
      // スクロールによってoffset=activeIndexで呼ばれた場合、
      // 取得結果の件数によってはactiveIndexが範囲外になり得る。
      const currentActive = activeIndexRef.current;
      if (currentActive < offset) {
        // offset未満は関係ない呼び出し（初回fetchなど）
        return;
      }

      // offset以降で有効なカード数
      const validCountAfterOffset = ids.length;
      const maxValidIndex = offset + validCountAfterOffset - 1;

      if (validCountAfterOffset === 0) {
        // offset以降が全滅 → offset=0から取り直して先頭へ
        if (offset > 0) {
          // 先頭へ強制スクロール
          flatListRef.current?.scrollToIndex({ index: 0, animated: true });
          setActiveIndex(0);
          activeIndexRef.current = 0;
        }
        // offset=0でも0件なら空画面（cardsが[]になるので自然に空表示）
      } else if (currentActive > maxValidIndex) {
        // 現在のインデックスが範囲外 → 最大有効インデックスへ
        const targetIndex = maxValidIndex;
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
        });
        setActiveIndex(targetIndex);
        activeIndexRef.current = targetIndex;
      }
      // currentActive <= maxValidIndex なら何もしない（正常）
    },
    [isFree, subscribeAndFetch, updateCards],
  );

  // ─── 初回フェッチ ──────────────────────────────────────
  const initialFetch = useCallback(async () => {
    setLoading(true);
    setCards([]);
    cardsRef.current = [];
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setShowGhost(false);

    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current.clear();
    moveHandlersRef.current.clear();
    finishedHandlersRef.current.clear();

    await fetchFromIndex(0);
    if (isMountedRef.current) setLoading(false);
  }, [fetchFromIndex]);

  // ─── スクロール時 ──────────────────────────────────────
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length === 0) return;

      const newIndex: number = viewableItems[0].index ?? 0;
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);

      // 無料ユーザーは FREE_PLAN_LIMIT 枚目（index = FREE_PLAN_LIMIT - 1）
      // に達したらこれ以上fetchしない（ゴースト表示のみ）
      if (isFree && newIndex >= FREE_PLAN_LIMIT - 1) return;

      // 現在インデックスを offset として先読み
      fetchFromIndex(newIndex);
    },
    [isFree, fetchFromIndex],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  // ─── リフレッシュ（空のときのみ） ──────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initialFetch();
    if (isMountedRef.current) setRefreshing(false);
  }, [initialFetch]);

  // ─── renderItem ──────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: number | MatchCardData; index: number }) => {
      if (typeof item === "number") {
        return <PlaceholderCard cardHeight={CARD_HEIGHT} />;
      }
      return (
        <MatchCard
          data={item}
          t={t}
          cardHeight={CARD_HEIGHT}
          boardWidth={boardWidth}
          onMove={registerMoveHandler}
          onFinished={registerFinishedHandler}
          isActive={index === activeIndex}
        />
      );
    },
    [
      t,
      CARD_HEIGHT,
      boardWidth,
      registerMoveHandler,
      registerFinishedHandler,
      activeIndex,
    ],
  );

  const keyExtractor = useCallback(
    (item: number | MatchCardData) =>
      typeof item === "number" ? `ph-${item}` : `card-${item.id}`,
    [],
  );

  // プレースホルダー中はスクロール不可（ただし空のときは除く）
  // 対局がある限り常にスクロール可能にするため、
  // 「全カードがreadyかどうか」ではなく
  // 「今見ているカードがreadyかどうか」でのみ制限する
  const currentCard = cards[activeIndex];
  const isCurrentReady =
    currentCard !== undefined && typeof currentCard !== "number";
  const scrollEnabled = cards.length === 0 || isCurrentReady;

  const isEmpty = cards.length === 0 && !loading;
  const isFreeLimitReached = isFree && activeIndex >= FREE_PLAN_LIMIT - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* リフレッシュボタン: web & 空のときのみ */}
      {Platform.OS === "web" && isEmpty && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh-circle"
            size={32}
            color={refreshing ? CHOCOLATE_SUB : STRAWBERRY}
          />
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        pagingEnabled
        data={cards}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled={scrollEnabled}
        getItemLayout={(_, i) => ({
          length: CARD_HEIGHT,
          offset: SNAP_INTERVAL * i,
          index: i,
        })}
        contentContainerStyle={
          isEmpty
            ? { flex: 1, alignItems: "center", justifyContent: "center" }
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        // プルリフレッシュ: 空のときのみ
        refreshControl={
          Platform.OS !== "web" && isEmpty ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={STRAWBERRY}
              titleColor={CHOCOLATE_SUB}
              colors={[STRAWBERRY]}
            />
          ) : undefined
        }
        ListEmptyComponent={
          isEmpty ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("Watch.noMatches")}</Text>
              <Text style={styles.emptyHint}>
                {Platform.OS !== "web"
                  ? t("Watch.pullToRefreshHint")
                  : t("Watch.pushToRefreshHint")}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          showGhost && isFreeLimitReached ? (
            <GhostCard cardHeight={CARD_HEIGHT} t={t} />
          ) : null
        }
      />

      <LoadingModal text={t("common.loading")} visible={loading} />
    </SafeAreaView>
  );
}

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
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: CHOCOLATE,
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 12,
    color: CHOCOLATE_SUB,
    letterSpacing: 0.5,
  },
  refreshButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  placeholderCard: {
    opacity: 0.5,
  },
  placeholderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  placeholderBadge: {
    width: 100,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(200,214,230,0.35)",
  },
  placeholderBoard: {
    width: "80%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(200,214,230,0.25)",
  },
  placeholderControls: {
    width: "60%",
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(200,214,230,0.2)",
  },
  cardAccentLine: {
    height: 2.5,
    backgroundColor: STRAWBERRY,
    opacity: 0.6,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(249,250,251,0.8)",
  },
  centerBadgeArea: {
    alignItems: "center",
    justifyContent: "center",
  },
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
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#48bb78",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#48bb78",
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
  controlsWrapper: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
