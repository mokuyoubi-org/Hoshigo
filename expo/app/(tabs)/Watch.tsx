import { GhostCard } from "@/src/components/Cards/GhostCard";
import { GoBoard } from "@/src/components/GoComponents/GoBoard";
import LoadingModal from "@/src/components/Modals/LoadingModal";
// import CustomPaywallScreen from "@/src/components/Sheets/CustomPayWallSheet";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { Agehama } from "@/src/constants/goConstants";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { PlanIdContext } from "@/src/contexts/UserContexts";
import { Board, initializeBoard } from "@/src/lib/goLogics";
import {
  intArrayToStringArray,
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
  Modal,
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
const PLACEHOLDER_ID_OFFSET = -1;

const makePlaceholders = (n: number): WatchMatch[] =>
  Array.from(
    { length: n },
    (_, i) => ({ id: PLACEHOLDER_ID_OFFSET - i }) as WatchMatch,
  );
const isPlaceholder = (m: WatchMatch) => (m.id as number) < 0;

// ─── 型定義 ────────────────────────────────────────────
type WatchMatch = {
  id: number;
  black_uid?: string;
  white_uid?: string;
  black_displayname?: string;
  white_displayname?: string;
  black_points?: number;
  white_points?: number;
  black_gumi_index?: number;
  white_gumi_index?: number;
  black_icon_index?: number;
  white_icon_index?: number;
  black_remain_seconds?: number;
  white_remain_seconds?: number;
  turn?: "black" | "white";
  status?: "waiting" | "playing" | "finished";
  result?: string;
  moves?: number[];
  dead_stones?: number[];
  match_type?: number;
};

type MatchCardData = {
  match: WatchMatch;
  moves: string[];
  boardHistory: Board[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][];
};

// ─── MatchCard ─────────────────────────────────────────
const MatchCard = React.memo(({ data, t }: { data: MatchCardData; t: any }) => {
  const [replayIndex, setReplayIndex] = useState(data.moves.length);
  const prevMovesLengthRef = useRef(data.moves.length);

  useEffect(() => {
    const newLength = data.moves.length;
    const wasAtLatest = replayIndex === prevMovesLengthRef.current;
    if (wasAtLatest && newLength > prevMovesLengthRef.current) {
      setReplayIndex(newLength);
    }
    prevMovesLengthRef.current = newLength;
  }, [data.moves.length]);

  const board = data.boardHistory[replayIndex] ?? initializeBoard(9);
  const { height } = useWindowDimensions();
  const boardSize = (height * 36) / 100;
  const CARD_HEIGHT = height * 0.72;

  return (
    <View style={[styles.card, { height: CARD_HEIGHT }]}>
      <View style={styles.cardAccentLine} />
      <View style={styles.matchHeader}>
        <View style={styles.centerBadgeArea}>
          {data.match.status === "finished" && data.match.result ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {resultToComment(data.match.result, t)}
              </Text>
            </View>
          ) : data.match.status === "playing" ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("Watch.playing")}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.boardWrapper}>
        <GoBoard
          matchType={data.match.match_type ?? 0}
          agehamaHistory={data.agehamaHistory}
          board={board}
          onPutStone={() => {}}
          moveHistory={data.moves}
          disabled={true}
          territoryBoard={data.territoryBoard}
          isGameEnded={true}
          boardHistory={data.boardHistory}
          currentIndex={replayIndex}
          boardWidth={boardSize}
        />
      </View>
    </View>
  );
});

// ─── buildCardData ──────────────────────────────────────
function buildCardData(match: WatchMatch): MatchCardData {
  const moves = intArrayToStringArray(match.moves ?? []);
  const { boardHistory, agehamaHistory } = movesToBoardHistory(
    9,
    match.match_type ?? 0,
    moves,
  );
  const territoryBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
  return { match, moves, boardHistory, agehamaHistory, territoryBoard };
}

// ─── メインコンポーネント ───────────────────────────────
export default function Watch() {
  const { t } = useTranslation();
  const { planId, setPlanId } = useContext(PlanIdContext)!;
  const { height } = useWindowDimensions();
  const CARD_HEIGHT = height * 0.72;
  const SNAP_INTERVAL = CARD_HEIGHT + 18;

  const [cards, setCards] = useState<MatchCardData[]>(
    makePlaceholders(FETCH_COUNT).map(buildCardData),
  );
  const [hasMore, setHasMore] = useState(true);
  const [showGhost, setShowGhost] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  const isFetchingMore = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cardsRef = useRef<MatchCardData[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchMatches(0);
    return () => {
      cleanupChannel();
    };
  }, []);

  // ─── チャンネルクリーンアップ ──────────────────────────
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // ─── 今見えている局だけsubscribe ───────────────────────
  const subscribeToMatch = useCallback(
    (matchId: number) => {
      cleanupChannel();
      if (!isMountedRef.current) return;

      channelRef.current = supabase
        .channel(`game:${matchId}`)
        .on("broadcast", { event: "move" }, (payload) => {
          if (!isMountedRef.current) return;

          setCards((prev) => {
            const next = prev.map((card) => {
              if (card.match.id !== matchId) return card;

              const newMatch: WatchMatch = {
                ...card.match,
                moves: payload.payload.moves,
                turn: payload.payload.turn,
                black_remain_seconds: payload.payload.black_remain_seconds,
                white_remain_seconds: payload.payload.white_remain_seconds,
                status: payload.payload.status,
                result: payload.payload.result,
                dead_stones: payload.payload.dead_stones,
              };
              return buildCardData(newMatch);
            });
            cardsRef.current = next;
            return next;
          });
        })
        .subscribe();
    },
    [cleanupChannel],
  );

  // ─── フェッチ ───────────────────────────────────────────
  const fetchMatches = useCallback(
    async (offset: number, isRefresh = false) => {
      if (!isRefresh) setLoading(true);

      const { data, error } = await supabase
        .schema("game")
        .from("playing")
        .select("*")
        .eq("status", "playing")
        .order("black_points", { ascending: false })
        .range(offset, offset + FETCH_COUNT - 1);

      if (!isMountedRef.current) return;
      if (error) {
        console.error("[Watch] fetch error", error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const fetched = (data ?? []) as WatchMatch[];
      const newCards = fetched.map(buildCardData);
      const reachedEnd = fetched.length < FETCH_COUNT;

      if (offset === 0) {
        cardsRef.current = newCards;
        setCards(newCards);
        // 最初の局をsubscribe
        if (newCards.length > 0) {
          subscribeToMatch(newCards[0].match.id);
        }
      } else {
        const next = [
          ...cardsRef.current.filter((c) => !isPlaceholder(c.match)),
          ...newCards,
        ];
        cardsRef.current = next;
        setCards(next);
      }

      setHasMore(!reachedEnd && planId !== null && planId >= 1);
      if (planId === 0 && !reachedEnd) setShowGhost(true);
      setLoading(false);
      setRefreshing(false);
      isFetchingMore.current = false;
    },
    [planId, subscribeToMatch],
  );

  // ─── 表示中の局が変わったらsubscribe切り替え ───────────
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length === 0) return;
      const topItem = viewableItems[0].item as MatchCardData;
      if (isPlaceholder(topItem.match)) return;
      subscribeToMatch(topItem.match.id);
    },
    [subscribeToMatch],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  // ─── プルリフレッシュ ────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cleanupChannel();
    await fetchMatches(0, true);
  }, [cleanupChannel, fetchMatches]);

  // ─── 無限スクロール ──────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore.current || showGhost) return;
    isFetchingMore.current = true;
    const realCount = cardsRef.current.filter(
      (c) => !isPlaceholder(c.match),
    ).length;
    setCards((prev) => [
      ...prev.filter((c) => !isPlaceholder(c.match)),
      ...makePlaceholders(FETCH_COUNT).map(buildCardData),
    ]);
    fetchMatches(realCount);
  }, [hasMore, showGhost, fetchMatches]);

  // ─── renderItem ──────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: MatchCardData }) => {
      if (isPlaceholder(item.match)) {
        return <View style={{ height: CARD_HEIGHT }} />;
      }
      return <MatchCard data={item} t={t} />;
    },
    [t, CARD_HEIGHT],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {Platform.OS === "web" && (
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
        pagingEnabled
        data={cards}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.match.id)}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, i) => ({
          length: CARD_HEIGHT,
          offset: SNAP_INTERVAL * i,
          index: i,
        })}
        contentContainerStyle={
          cards.length === 0
            ? { flex: 1, alignItems: "center", justifyContent: "center" }
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        // リフレッシュ関連をplatformで分岐
        refreshControl={
          Platform.OS !== "web" ? (
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("Watch.noMatches")}</Text>
            <Text style={styles.emptyHint}>
              {Platform.OS !== "web"
                ? t("Watch.pullToRefreshHint")
                : t("Watch.pushToRefreshHint")}
            </Text>
          </View>
        }
        ListFooterComponent={
          showGhost ? (
            <GhostCard
              cardHeight={CARD_HEIGHT}
              t={t}
              setShowPaywall={setShowPaywall}
            />
          ) : null
        }
      />
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        {/* <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} /> */}
      </Modal>
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
});
