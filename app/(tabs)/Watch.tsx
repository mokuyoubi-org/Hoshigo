import {
  Agehama,
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToLanguages,
} from "@/src/lib/goUtils";
import { moveNumbersToStrings } from "@/src/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoBoardWithReplay } from "../../src/components/GoBoardWithReplay";
import LoadingOverlay from "../../src/components/LoadingOverlay";
import { PlayerCard } from "../../src/components/PlayerCard";
import { useTheme } from "../../src/hooks/useTheme";
import { Board, initializeBoard } from "../../src/lib/goLogics";
import { supabase } from "../../src/services/supabase";
import { StarBackground } from "@/src/components/StarBackGround";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

// ─── 型定義（変更なし） ───────────────────────────────
type Match = {
  id: string;
  black_uid: string;
  white_uid: string | null;
  black_username: string;
  white_username: string | null;
  black_displayname: string;
  white_displayname: string | null;
  status: "waiting" | "playing" | "ended";
  moves: number[];
  created_at: string;
  result: string | null;
  dead_stones: number[];
  black_last_seen: string | null;
  white_last_seen: string | null;
  turn: "black" | "white";
  turn_switched_at: string | null;
  black_remain_seconds: number;
  white_remain_seconds: number;
  black_points: number;
  white_points: number;
  black_gumi_index: number;
  white_gumi_index: number;
  black_icon_index: number;
  white_icon_index: number;
  match_type: number;
};

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

// ─── MatchCard（UIを大幅変更） ────────────────────────
const MatchCard = React.memo(
  ({ data, colors, t }: { data: MatchCardData; colors: any; t: any }) => {
    // ── ロジック（変更なし） ──
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

    // ── UI ──
    return (
      <Animated.View style={[styles.matchCard, { opacity: fadeIn }]}>
        {/* カード上部の優しいアクセントライン */}
        <View style={styles.cardAccentLine} />

        {/* ヘッダー */}
        <View style={styles.matchHeader}>
          {/* 黒番プレイヤー */}
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

          {/* 中央：LIVE / 結果 */}
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

          {/* 白番プレイヤー */}
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

        {/* 碁盤 */}
        <View style={styles.boardWrapper}>
          <GoBoardWithReplay
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
          />
        </View>
      </Animated.View>
    );
  },
);

// ─── buildCardData（変更なし） ────────────────────────
function buildCardData(match: Match): MatchCardData {
  const newMoves = moveNumbersToStrings(match.moves);
  console.log("match.match_type: ", match.match_type);
  const { boardHistory, agehamaHistory } = movesToBoardHistory(9,
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
  const { t } = useTranslation();
  const { colors } = useTheme();

  // ── ロジック（変更なし） ──
  const [matchCardsData, setMatchCardsData] = useState<MatchCardData[]>([]);
  const matchCardsDataRef = useRef<{ [id: string]: MatchCardData }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const init = async () => {
      const ids = await fetchMatches();
      if (ids) setupSubscription(ids);
    };
    init();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
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
              ? { ...card, blackRemainSeconds: u.black, whiteRemainSeconds: u.white }
              : card;
          }),
        );
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchMatches = async () => {
    if (!refreshing) setLoading(true);
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "playing")
      .order("black_points", { ascending: false })
      .limit(3);
    if (error) {
      console.error("fetch error", error);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const cards = data.map((match: Match) => buildCardData(match));
    const cardMap: { [id: string]: MatchCardData } = {};
    cards.forEach((c: MatchCardData) => { cardMap[c.id] = c; });
    matchCardsDataRef.current = cardMap;
    setMatchCardsData(cards);
    setLoading(false);
    setRefreshing(false);
    return data.map((m: Match) => m.id);
  };

  const setupSubscription = (matchIds: string[]) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase.channel("matches-watch");
    matchIds.forEach((matchId) => {
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const current = matchCardsDataRef.current[payload.new.id];
          if (!current) return;
          const newMoves = moveNumbersToStrings(payload.new.moves);
          const oldLength = current.moves.length;
          const newLength = newMoves.length;
          let updated: MatchCardData = { ...current };
          if (oldLength < newLength) {
            const { boardHistory, agehamaHistory } = movesToBoardHistory(9,
              payload.new.match_type, newMoves,
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
              updated.territoryBoard = makeTerritoryBoard(9,
                updated.boardHistory[updated.boardHistory.length - 1],
                moveNumbersToStrings(payload.new.dead_stones),
                current.matchType,
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
    channel.subscribe();
    channelRef.current = channel;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const ids = await fetchMatches();
    if (ids) setupSubscription(ids);
  };

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
             <StarBackground />   
      

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>

        {/* スクロールエリア */}
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
              {/* <View style={styles.emptyIcon}>
                <View style={styles.emptyIconInner} />
              </View> */}
                  <Image 
        source={require('@/assets/images/iconSleep.png')} 
        style={{ width: 80, height: 80 }} 
      />
              <Text style={styles.emptyText}>{t("Watch.noMatches")}</Text>
              <Text style={styles.emptyHint}>{t("Watch.pullToRefreshHint")}</Text>
            </View>
          ) : (
            matchCardsData.map((data) => (
              <MatchCard key={data.id} data={data} colors={colors} t={t} />
            ))
          )}
        </ScrollView>
      </Animated.View>

      {loading && <LoadingOverlay text={t("Watch.loading")} />}
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

  // 背景グリッド（優しい色に）
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

  // ページヘッダー
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

  // スクロール
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 18,
  },

  // 空状態
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

  // マッチカード
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

  // マッチヘッダー
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

  // 中央バッジエリア
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

  // 碁盤ラッパー
  boardWrapper: {
    borderTopWidth: 1,
    borderTopColor: "rgba(200,214,230,0.15)",
    backgroundColor: "#fafbfc",
  },
});