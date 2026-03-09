import { StarBackground } from "@/src/components/backGrounds/StarBackGround";
import { GoBoard } from "@/src/components/goComponents/GoBoard";
import { PlayerCard } from "@/src/components/goComponents/PlayerCard";
import LoadingModal from "@/src/components/modals/LoadingModal";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { Agehama, Match } from "@/src/constants/goConstants";
import { ICONS } from "@/src/constants/icons";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { Board, initializeBoard } from "@/src/lib/goLogics";
import {
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToLanguages,
} from "@/src/lib/goUtils";
import { moveNumbersToStrings } from "@/src/lib/utils";
import { supabase } from "@/src/services/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── リトライ設定 ─────────────────────────────────────
const MAX_RETRY_COUNT = 5;
const RETRY_BASE_DELAY_MS = 1000; // 指数バックオフのベース（1秒）

// ─── 型定義 ───────────────────────────────────────────
type MatchCardData = {
  id: string;
  blackUsername: string;
  whiteUsername: string;
  blackDisplayname: string;
  whiteDisplayname: string;
  blackPoints: number;
  whitePoints: number;
  blackGumiIndex: number;
  whiteGumiIndex: number;
  blackIconIndex: number;
  whiteIconIndex: number;
  blackRemainSeconds: number;
  whiteRemainSeconds: number;
  turn: "black" | "white";
  status: "waiting" | "playing" | "ended";
  result: string;
  moves: string[];
  boardHistory: Board[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][];
  matchType: number;
};

// ─── MatchCard ────────────────────────────────────────
const MatchCard = React.memo(
  ({ data, colors, t }: { data: MatchCardData; colors: any; t: any }) => {
    const [replayIndex, setReplayIndex] = useState(data.moves.length);
    const prevMovesLengthRef = useRef(data.moves.length);
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, []);

    useEffect(() => {
      const newLength = data.moves.length;
      const wasAtLatest = replayIndex === prevMovesLengthRef.current;
      if (wasAtLatest && newLength > prevMovesLengthRef.current) {
        setReplayIndex(newLength);
      }
      prevMovesLengthRef.current = newLength;
    }, [data.moves.length]);

    const board = data.boardHistory[replayIndex] ?? initializeBoard(9);
    const isAtLatest = replayIndex === data.boardHistory.length - 1;

    return (
      <Animated.View style={[styles.matchCard, { opacity: fadeIn }]}>
        <View style={styles.cardAccentLine} />

        <View style={styles.matchHeader}>
          <View style={styles.playerRow}>
            <PlayerCard
              gumiIndex={data.blackGumiIndex}
              iconIndex={data.blackIconIndex}
              username={data.blackUsername}
              displayname={data.blackDisplayname}
              points={data.blackPoints}
              color="black"
              time={data.blackRemainSeconds}
              isActive={data.turn === "black" && isAtLatest}
            />
          </View>

          <View style={styles.centerBadgeArea}>
            {data.status === "ended" && data.result ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>
                  {resultToLanguages(data.result)}
                </Text>
              </View>
            ) : data.status === "playing" ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t("Watch.playing")}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.playerRow}>
            <PlayerCard
              gumiIndex={data.whiteGumiIndex}
              iconIndex={data.whiteIconIndex}
              username={data.whiteUsername}
              displayname={data.whiteDisplayname}
              points={data.whitePoints}
              color="white"
              time={data.whiteRemainSeconds}
              isActive={data.turn === "white" && isAtLatest}
            />
          </View>
        </View>

        <View style={styles.boardWrapper}>
          <GoBoard
            matchType={data.matchType}
            agehamaHistory={data.agehamaHistory}
            board={board}
            onPutStone={() => {}}
            moveHistory={data.moves}
            disabled={true}
            territoryBoard={data.territoryBoard}
            isGameEnded={true}
            boardHistory={data.boardHistory}
            currentIndex={replayIndex}
            onCurrentIndexChange={setReplayIndex}
            boardWidth={0}
          />
        </View>
      </Animated.View>
    );
  },
);

// ─── buildCardData ────────────────────────────────────
function buildCardData(match: Match): MatchCardData {
  const newMoves = moveNumbersToStrings(match.moves);
  const { boardHistory, agehamaHistory } = movesToBoardHistory(
    9,
    match.match_type,
    newMoves,
  );
  const territoryBoard = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => 0),
  );
  return {
    id: match.id,
    blackUsername: match.black_username || "",
    whiteUsername: match.white_username || "",
    blackDisplayname: match.black_displayname || "",
    whiteDisplayname: match.white_displayname || "",
    blackPoints: match.black_points,
    whitePoints: match.white_points,
    blackGumiIndex: match.black_gumi_index,
    whiteGumiIndex: match.white_gumi_index,
    blackIconIndex: match.black_icon_index,
    whiteIconIndex: match.white_icon_index,
    blackRemainSeconds: match.black_remain_seconds,
    whiteRemainSeconds: match.white_remain_seconds,
    turn: match.turn,
    status: match.status,
    result: match.result ?? "",
    moves: newMoves,
    boardHistory,
    agehamaHistory,
    territoryBoard,
    matchType: match.match_type,
  };
}

// ─── メインコンポーネント ──────────────────────────────
export default function Watch() {
  const { colors } = useTheme();
const { t } = useTranslation();
  const [matchCardsData, setMatchCardsData] = useState<MatchCardData[]>([]);
  const matchCardsDataRef = useRef<{ [id: string]: MatchCardData }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // サブスク関連
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMatchIdsRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);

  // タイマー
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // フェードイン
  const fadeIn = useRef(new Animated.Value(0)).current;

  // ─── マウント管理 ───────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── フェードイン ───────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // ─── チャンネルクリーンアップ ────────────────────────
  const cleanupChannel = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  // ─── サブスク（リトライ付き） ────────────────────────
  const setupSubscription = useCallback(
    (matchIds: string[], retryCount = 0) => {
      if (!isMountedRef.current) return;

      // 既存チャンネルを破棄
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // チャンネル名をユニークにして二重登録を防ぐ
      const channel = supabase.channel(`matches-watch-${Date.now()}`);

      matchIds.forEach((matchId) => {
        channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matches",
            filter: `id=eq.${matchId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;

            const current = matchCardsDataRef.current[payload.new.id];
            if (!current) return;

            const newMoves = moveNumbersToStrings(payload.new.moves);
            const oldLength = current.moves.length;
            const newLength = newMoves.length;
            let updated: MatchCardData = { ...current };

            if (oldLength < newLength) {
              const { boardHistory, agehamaHistory } = movesToBoardHistory(
                9,
                payload.new.match_type,
                newMoves,
              );
              updated = {
                ...updated,
                moves: newMoves,
                boardHistory,
                agehamaHistory,
                turn: payload.new.turn,
                blackRemainSeconds: payload.new.black_remain_seconds,
                whiteRemainSeconds: payload.new.white_remain_seconds,
              };
            }

            if (payload.new.status) {
              updated.status = payload.new.status;
              updated.result = payload.new.result ?? "";
              if (
                payload.new.result &&
                payload.new.result.length > 2 &&
                !["R", "T", "C"].includes(payload.new.result[2]) &&
                updated.boardHistory.length > 0
              ) {
                updated.territoryBoard = makeTerritoryBoard(
                  9,
                  updated.boardHistory[updated.boardHistory.length - 1],
                  moveNumbersToStrings(payload.new.dead_stones),
                  current.matchType,
                  // updated.agehamaHistory[updated.agehamaHistory.length - 1]
                  //   .black,
                  // updated.agehamaHistory[updated.agehamaHistory.length - 1]
                  //   .white,
                  0,
                  0,
                ).territoryBoard;
              }
            }

            matchCardsDataRef.current[payload.new.id] = updated;
            setMatchCardsData((prev) =>
              prev.map((c) => (c.id === payload.new.id ? updated : c)),
            );
          },
        );
      });

      channel.subscribe((status, err) => {
        if (!isMountedRef.current) return;

        if (status === "SUBSCRIBED") {
          // 購読成功：リトライカウンタをリセット
          retryCountRef.current = 0;
          console.log("[Watch] Realtime subscribed:", matchIds);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          // 購読失敗：指数バックオフでリトライ
          console.warn(`[Watch] Realtime ${status}:`, err);
          if (retryCount < MAX_RETRY_COUNT) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
            console.log(
              `[Watch] Retrying subscription in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_COUNT})`,
            );
            retryTimeoutRef.current = setTimeout(() => {
              if (!isMountedRef.current) return;
              setupSubscription(currentMatchIdsRef.current, retryCount + 1);
            }, delay);
          } else {
            console.error("[Watch] Max retry count reached. Giving up.");
          }
        }
      });

      channelRef.current = channel;
    },
    [],
  );

  // ─── フェッチ ────────────────────────────────────────
  const fetchMatches = useCallback(
    async (isRefresh = false): Promise<string[] | undefined> => {
      if (!isRefresh) setLoading(true);

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "playing")
        .order("black_points", { ascending: false })
        .limit(3);

      if (!isMountedRef.current) return;

      if (error) {
        console.error("[Watch] fetch error", error);
        setLoading(false);
        setRefreshing(false);
        return undefined;
      }

      const cards = (data as Match[]).map(buildCardData);
      const cardMap: { [id: string]: MatchCardData } = {};
      cards.forEach((c) => {
        cardMap[c.id] = c;
      });
      matchCardsDataRef.current = cardMap;
      setMatchCardsData(cards);
      setLoading(false);
      setRefreshing(false);

      const ids = (data as Match[]).map((m) => m.id);
      currentMatchIdsRef.current = ids;
      return ids;
    },
    [],
  );

  // ─── 初期化 ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const ids = await fetchMatches();
      // 空配列のときはサブスク不要
      if (ids && ids.length > 0) {
        setupSubscription(ids);
      }
    };
    init();

    return () => {
      cleanupChannel();
    };
  }, []);

  // ─── カウントダウンタイマー ──────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;

      const updates: { id: string; black: number; white: number }[] = [];

      Object.values(matchCardsDataRef.current).forEach((card) => {
        if (card.status !== "playing") return;
        let black = card.blackRemainSeconds;
        let white = card.whiteRemainSeconds;
        if (card.turn === "black") {
          black = Math.max(0, black - 1);
        } else {
          white = Math.max(0, white - 1);
        }
        matchCardsDataRef.current[card.id] = {
          ...card,
          blackRemainSeconds: black,
          whiteRemainSeconds: white,
        };
        updates.push({ id: card.id, black, white });
      });

      if (updates.length > 0) {
        setMatchCardsData((prev) =>
          prev.map((card) => {
            const u = updates.find((u) => u.id === card.id);
            return u
              ? {
                  ...card,
                  blackRemainSeconds: u.black,
                  whiteRemainSeconds: u.white,
                }
              : card;
          }),
        );
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── プルリフレッシュ ────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // 既存サブスクをリセット
    cleanupChannel();
    const ids = await fetchMatches(true);
    if (ids && ids.length > 0) {
      setupSubscription(ids);
    }
  }, [cleanupChannel, fetchMatches, setupSubscription]);

  // ─── UI ──────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <StarBackground />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={STRAWBERRY}
              title={t("Watch.pullToRefresh")}
              titleColor={CHOCOLATE_SUB}
              colors={[STRAWBERRY]}
              progressBackgroundColor="#ffffff"
            />
          }
        >
          {matchCardsData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image source={ICONS[90]} style={{ width: 80, height: 80 }} />
              <Text style={styles.emptyText}>{t("Watch.noMatches")}</Text>
              <Text style={styles.emptyHint}>
                {t("Watch.pullToRefreshHint")}
              </Text>
            </View>
          ) : (
            matchCardsData.map((data) => (
              <MatchCard key={data.id} data={data} colors={colors} t={t} />
            ))
          )}
        </ScrollView>
      </Animated.View>

      {loading && <LoadingModal text={t("Watch.loading")} />}
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flex: 1,
  },
  bgLineV: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "rgba(200,214,230,0.08)",
  },
  bgLineH: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 1,
    backgroundColor: "rgba(200,214,230,0.08)",
  },
  pageHeader: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.2)",
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  pageTitleAccent: {
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: STRAWBERRY,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1.5,
  },
  pageSubtitle: {
    fontSize: 11,
    color: CHOCOLATE_SUB,
    letterSpacing: 1.5,
    paddingLeft: 13,
  },
  scrollView: { flex: 1 },
  scrollContent: {
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
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  emptyIconInner: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
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
  matchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardAccentLine: {
    height: 2.5,
    backgroundColor: STRAWBERRY,
    opacity: 0.6,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(249,250,251,0.8)",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  centerBadgeArea: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
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
    shadowColor: "#48bb78",
    shadowOpacity: 0.8,
    shadowRadius: 4,
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
    alignItems: "center",
  },
  resultText: {
    fontSize: 13,
    fontWeight: "600",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  boardWrapper: {
    borderTopWidth: 1,
    borderTopColor: "rgba(200,214,230,0.15)",
    backgroundColor: "#fafbfc",
  },
});
