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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoBoardWithReplay } from "../../src/components/GoBoardWithReplay";
import LoadingOverlay from "../../src/components/LoadingOverlay";
import { PlayerCard } from "../../src/components/PlayerCard";
import { useTheme } from "../../src/hooks/useTheme";
import { Board, initializeBoard } from "../../src/lib/goLogics";
import { supabase } from "../../src/services/supabase";

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
};

// ① カードが持つ「計算済みデータ」をまとめた型
type MatchCardData = {
  id: string;
  // プレイヤー情報
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
  // ゲーム状態
  blackRemainSeconds: number;
  whiteRemainSeconds: number;
  turn: "black" | "white";
  status: "waiting" | "playing" | "ended";
  result: string;
  // 盤面
  moves: string[];
  boardHistory: Board[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][];
};

// ② MatchCardコンポーネント: replayIndexを自己管理 + React.memo
const MatchCard = React.memo(
  ({ data, colors, t }: { data: MatchCardData; colors: any; t: any }) => {
    const [replayIndex, setReplayIndex] = useState(data.moves.length);

    // ③ リアルタイムで新しい手が来たとき、最新手を見ていたら自動追従
    const prevMovesLengthRef = useRef(data.moves.length);
    useEffect(() => {
      const newLength = data.moves.length;
      const wasAtLatest = replayIndex === prevMovesLengthRef.current;
      if (wasAtLatest && newLength > prevMovesLengthRef.current) {
        setReplayIndex(newLength); // 最新手に追従
      }
      prevMovesLengthRef.current = newLength;
    }, [data.moves.length]);

    const board = data.boardHistory[replayIndex] ?? initializeBoard();
    const isAtLatest = replayIndex === data.boardHistory.length - 1;

    return (
      <View
        style={[
          styles.matchCard,
          { backgroundColor: colors.card, borderColor: colors.borderColor },
        ]}
      >
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
          <View>
            {data.status === "ended" && data.result && (
              <View
                style={[
                  styles.resultContainer,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <Text style={[styles.resultText, { color: colors.text }]}>
                  {resultToLanguages(data.result)}
                </Text>
              </View>
            )}
            {data.status === "playing" && (
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t("Watch.playing")}</Text>
              </View>
            )}
          </View>
        </View>

        <GoBoardWithReplay
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
    );
  },
);

// ④ Match → MatchCardData の変換関数（レンダリング外で定義）
function buildCardData(match: Match): MatchCardData {
  const newMoves = moveNumbersToStrings(match.moves);
  const { boardHistory, agehamaHistory } = movesToBoardHistory(newMoves);
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
  };
}

export default function Watch() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // ⑤ stateをmatchCardsData一本に集約（バラバラのstateを廃止）
  const [matchCardsData, setMatchCardsData] = useState<MatchCardData[]>([]);
  const matchCardsDataRef = useRef<{ [id: string]: MatchCardData }>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ⑥ タイマー: refを直接いじってからsetStateで差分更新
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
    cards.forEach((c: MatchCardData) => {
      cardMap[c.id] = c;
    });

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
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const current = matchCardsDataRef.current[payload.new.id];
          if (!current) return;

          const newMoves = moveNumbersToStrings(payload.new.moves);
          const oldLength = current.moves.length;
          const newLength = newMoves.length;

          let updated: MatchCardData = { ...current };

          if (oldLength < newLength) {
            // 新しい手が来た
            const { boardHistory, agehamaHistory } =
              movesToBoardHistory(newMoves);
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
                updated.boardHistory[updated.boardHistory.length - 1],
                moveNumbersToStrings(payload.new.dead_stones),
              ).territoryBoard;
            }
          }

          matchCardsDataRef.current[payload.new.id] = updated;
          // ⑦ 変更があったカードだけ差分更新
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.button}
            title={t("Watch.pullToRefresh")}
            titleColor={colors.subtext}
            colors={[colors.button]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {matchCardsData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t("Watch.noMatches")}
            </Text>
            <Text style={[styles.pullToRefreshHint, { color: colors.subtext }]}>
              {t("Watch.pullToRefreshHint")}
            </Text>
          </View>
        ) : (
          matchCardsData.map((data) => (
            <MatchCard key={data.id} data={data} colors={colors} t={t} />
          ))
        )}
      </ScrollView>
      {loading && <LoadingOverlay text={t("Watch.loading")} />}
    </SafeAreaView>
  );
}

// stylesは元のまま
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 16 },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, marginBottom: 12 },
  pullToRefreshHint: { fontSize: 14, fontWeight: "500", opacity: 0.7 },
  matchCard: {
    marginHorizontal: 8,
    marginBottom: 24,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerRow: { flexDirection: "row", alignItems: "center" },
  resultContainer: {
    borderRadius: 12,
    marginVertical: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  resultText: { fontSize: 16, fontWeight: "600", letterSpacing: 0.3 },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#48bb78",
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#48bb78",
    letterSpacing: 0.3,
  },
});
