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
import { Board, initializeBoard } from "../../src/lib/goLogics";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/lib/useTheme";

type Match = {
  id: string; // 対局自体のid。supabaseが設定
  black_uid: string; // 黒のuid
  white_uid: string | null; // 白のuid
  black_displayname: string; // 黒の表示名
  white_displayname: string | null; // 白の表示名
  status: "waiting" | "playing" | "ended"; // 相手待ちか、対局中か、終局後か
  moves: number[]; // 一連の手
  created_at: string; // supabaseが設定
  result: string | null; // 結果
  dead_stones: number[]; // 死に石
  black_last_seen: string | null; // 黒の最後のハートビート
  white_last_seen: string | null; // 白の最後のハートビート
  turn: "black" | "white"; // 今黒番か白番か
  turn_switched_at: string | null; // 最後に手番が交代した時刻。
  black_remain_seconds: number; // 0~180。黒の残り時間
  white_remain_seconds: number; // 0~180。白の残り時間
  black_points: number; // 黒のポイント
  white_points: number; // 白のポイント
  black_gumi_index: number; // 黒のぐみindex
  white_gumi_index: number; // 白のぐみindex
  black_icon_index: number;
  white_icon_index: number;
};

export default function Watch() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const matchIdsRef = useRef<string[]>([]);

  const [boardHistories, setBoardHistories] = useState<{
    // 3局のboardHistory。{match1: [,,,], match2: [,,,]}みたいな感じ⭐️ keyはmatchのid
    [key: string]: Board[];
  }>({});
  const boardHistoriesRef = useRef<{
    [key: string]: Board[];
  }>({});
  const [agehamaHistories, setAgehamaHistories] = useState<{
    [key: string]: Agehama[];
  }>({});

  const [movess, setMovess] = useState<{
    // 3局のmoveHistory。{match1: [,,,], match2: [,,,]}みたいな感じ⭐️ keyはmatchのid
    [key: string]: string[];
  }>({});
  const movessRef = useRef<{
    [key: string]: string[];
  }>({});
  const [replayIndexes, setReplayIndexes] = useState<{
    // 3局の今何手目を表示してるかのリスト。{match1: 20, match2: 30}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});
  const replayIndexesRef = useRef<{
    [key: string]: number;
  }>({});
  const [blackDisplayNames, setBlackDisplayNames] = useState<{
    // {match1: "たろう", match2: "じろう"}みたいな感じ⭐️ keyはmatchのid
    [key: string]: string;
  }>({});
  const [whiteDisplayNames, setWhiteDisplayNames] = useState<{
    // {match1: "たろう", match2: "じろう"}みたいな感じ⭐️ keyはmatchのid
    [key: string]: string;
  }>({});
  const [blackPointss, setBlackPointss] = useState<{
    // {match1: 1150, match2: 950}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});
  const [whitePointss, setWhitePointss] = useState<{
    // {match1: 1150, match2: 950}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});

  const [blackGumiIndexs, setBlackGumiIndexs] = useState<{
    [key: string]: number;
  }>({});
  const [whiteGumiIndexs, setWhiteGumiIndexs] = useState<{
    [key: string]: number;
  }>({});

  const [blackIconIndexs, setBlackIconIndexs] = useState<{
    // {match1: 1150, match2: 950}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});
  const [whiteIconIndexs, setWhiteIconIndexs] = useState<{
    // {match1: 1150, match2: 950}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});
  const [blackRemainSecondss, setBlackRemainSecondss] = useState<{
    // {match1: 157, match2: 180}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});
  const blackRemainSecondssRef = useRef<{
    [key: string]: number;
  }>({});
  const [whiteRemainSecondss, setWhiteRemainSecondss] = useState<{
    // {match1: 127, match2: 134}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number;
  }>({});
  const whiteRemainSecondssRef = useRef<{
    [key: string]: number;
  }>({});
  const [turns, setTurns] = useState<{
    // {match1: "black", match2: "white"}みたいな感じ⭐️ keyはmatchのid
    [key: string]: string;
  }>({});
  const turnsRef = useRef<{
    // {match1: "black", match2: "white"}みたいな感じ⭐️ keyはmatchのid
    [key: string]: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null); // タイマーのidが入ってる。
  const [statuss, setStatuss] = useState<{
    [key: string]: string;
  }>({}); // 今は使っていないが、そのうち使う。終局とか対局中、とかの表示で⭐️
  const statussRef = useRef<{
    [key: string]: string;
  }>({});
  const [results, setResults] = useState<{
    [key: string]: string;
  }>({}); // 今は使っていないが、そのうち使う。終局とか対局中、とかの表示で⭐️
  const resultsRef = useRef<{
    [key: string]: string;
  }>({});

  const [territoryBoards, setTerritoryBoards] = useState<{
    // {match1: "black", match2: "white"}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number[][];
  }>({});
  const territoryBoardsRef = useRef<{
    // {match1: [[0,0,..],[]..], match2: [[0,0,..],[]..]}みたいな感じ⭐️ keyはmatchのid
    [key: string]: number[][];
  }>({});

  // 初回ロード
  useEffect(() => {
    const init = async () => {
      const data = await fetchMatches();
      if (data) {
        const ids = data.map((m) => m.id);
        matchIdsRef.current = ids;
        setupSubscription(ids);
      }
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // 時間の処理
  useEffect(() => {
    timerRef.current = setInterval(() => {
      matchIdsRef.current.forEach((matchId) => {
        if (statussRef.current[matchId] === "playing") {
          if (turnsRef.current[matchId] === "black") {
            blackRemainSecondssRef.current[matchId] = Math.max(
              0,
              blackRemainSecondssRef.current[matchId] - 1,
            );
            setBlackRemainSecondss((prev) => ({
              ...prev,
              [matchId]: Math.ceil(blackRemainSecondssRef.current[matchId]),
            }));
          } else {
            whiteRemainSecondssRef.current[matchId] = Math.max(
              0,
              whiteRemainSecondssRef.current[matchId] - 1,
            );

            setWhiteRemainSecondss((prev) => ({
              ...prev,
              [matchId]: Math.ceil(whiteRemainSecondssRef.current[matchId]),
            }));
          }
        }
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // まず取ってくる
  const fetchMatches = async () => {
    if (!refreshing) {
      setLoading(true);
    }

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

    // 取ってきて、そしてやること
    const boardHistories_: { [key: string]: Board[] } = {};
    const agehamaHistories_: { [key: string]: Agehama[] } = {};
    const movess_: { [key: string]: string[] } = {};
    const replayIndexes_: { [key: string]: number } = {};
    const blackDisplayNames_: { [key: string]: string } = {};
    const whiteDisplayNames_: { [key: string]: string } = {};
    const blackPointss_: { [key: string]: number } = {};
    const whitePointss_: { [key: string]: number } = {};
    const blackGumiIndexs_: { [key: string]: number } = {};
    const whiteGumiIndexs_: { [key: string]: number } = {};
    const blackIconIndexs_: { [key: string]: number } = {};
    const whiteIconIndexs_: { [key: string]: number } = {};
    const blackRemainSecondss_: { [key: string]: number } = {};
    const whiteRemainSecondss_: { [key: string]: number } = {};
    const turns_: { [key: string]: string } = {};
    const statuss_: { [key: string]: string } = {};
    const results_: { [key: string]: string } = {};

    const territoryBoards_: { [key: string]: number[][] } = {};

    data.forEach((match: Match) => {
      const newMoves = moveNumbersToStrings(match.moves);
      const histories = movesToBoardHistory(newMoves);
      boardHistories_[match.id] = histories.boardHistory;
      agehamaHistories_[match.id] = histories.agehamaHistory;
      movess_[match.id] = newMoves;
      replayIndexes_[match.id] = newMoves.length; // 初期表示は最新局面 ⭐️
      blackDisplayNames_[match.id] = match.black_displayname || "";
      whiteDisplayNames_[match.id] = match.white_displayname || "";
      blackPointss_[match.id] = match.black_points;
      whitePointss_[match.id] = match.white_points;
      blackGumiIndexs_[match.id] = match.black_gumi_index;
      whiteGumiIndexs_[match.id] = match.white_gumi_index;
      blackIconIndexs_[match.id] = match.black_icon_index;
      whiteIconIndexs_[match.id] = match.white_icon_index;
      blackRemainSecondss_[match.id] = match.black_remain_seconds;
      whiteRemainSecondss_[match.id] = match.white_remain_seconds;
      turns_[match.id] = match.turn;
      statuss_[match.id] = match.status;
      results_[match.id] = match.result ?? "";

      territoryBoards_[match.id] = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => 0),
      );
    });

    // 3局まとめて追加
    setBoardHistories(boardHistories_); // ⭐️
    boardHistoriesRef.current = boardHistories_;
    setAgehamaHistories(agehamaHistories_); // ⭐️

    setReplayIndexes(replayIndexes_); // ⭐️
    replayIndexesRef.current = replayIndexes_;
    setMovess(movess_);
    movessRef.current = movess_;
    setTurns(turns_);
    turnsRef.current = turns_;
    setStatuss(statuss_);
    statussRef.current = statuss_;
    setResults(results_);
    resultsRef.current = results_;

    setTerritoryBoards(territoryBoards_);
    territoryBoardsRef.current = territoryBoards_;
    setBlackDisplayNames(blackDisplayNames_);
    setWhiteDisplayNames(whiteDisplayNames_);
    setBlackPointss(blackPointss_);
    setWhitePointss(whitePointss_);
    setBlackGumiIndexs(blackGumiIndexs_);
    setWhiteGumiIndexs(whiteGumiIndexs_);
    setBlackIconIndexs(blackIconIndexs_);
    setWhiteIconIndexs(whiteIconIndexs_);
    setBlackRemainSecondss(blackRemainSecondss_);
    blackRemainSecondssRef.current = blackRemainSecondss_;
    setWhiteRemainSecondss(whiteRemainSecondss_);
    whiteRemainSecondssRef.current = whiteRemainSecondss_;
    setLoading(false);
    setRefreshing(false);
    matchIdsRef.current = data.map((m) => m.id); // ← ★これ！！
    return data;
  };

  // サブスクリプションをセットアップ
  const setupSubscription = (matchIds: string[]) => {
    // 既存のチャンネルがあれば削除
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // 新しいチャンネルを作成
    const channel = supabase.channel("matches-watch");

    // 各対局IDに対してフィルターを設定
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
          const oldMoves = movessRef.current[payload.new.id];
          const newMoves = moveNumbersToStrings(payload.new.moves);
          if (!oldMoves || !newMoves) return;
          const oldLength = oldMoves.length;
          const newLength = newMoves.length;

          if (oldLength < newLength) {
            // 新しい手が来たということなので、更新
            setMovess((prev) => ({
              ...prev,
              [payload.new.id]: newMoves,
            }));
            movessRef.current[payload.new.id] = newMoves;

            const histories = movesToBoardHistory(newMoves);
            // 新しい手が来たということなので、更新
            setBoardHistories((prev) => ({
              ...prev,
              [payload.new.id]: histories.boardHistory,
            }));
            boardHistoriesRef.current[payload.new.id] = histories.boardHistory;

            setAgehamaHistories((prev) => ({
              ...prev,
              [payload.new.id]: histories.agehamaHistory,
            }));

            // turnの更新
            setTurns((prev) => ({
              ...prev,
              [payload.new.id]: payload.new.turn,
            }));
            turnsRef.current[payload.new.id] = payload.new.turn;

            // blackRemainSecondsの更新
            setBlackRemainSecondss((prev) => ({
              ...prev,
              [payload.new.id]: payload.new.black_remain_seconds,
            }));

            // whiteRemainSecondsの更新
            setWhiteRemainSecondss((prev) => ({
              ...prev,
              [payload.new.id]: payload.new.white_remain_seconds,
            }));

            // また、もし観戦者が最新の手を見ていたら、更新
            if (replayIndexesRef.current[payload.new.id] === oldLength) {
              setReplayIndexes((prev) => ({
                ...prev,
                // [payload.new.id]: newLength - 1,
                [payload.new.id]: newLength,
              }));
              replayIndexesRef.current[payload.new.id] = newLength;
            }
          } else if (payload.new.status) {
            // statusの更新
            setStatuss((prev) => ({
              ...prev,
              [payload.new.id]: payload.new.status,
            }));
            statussRef.current[payload.new.id] = payload.new.status;

            setResults((prev) => ({
              ...prev,
              [payload.new.id]: payload.new.result ?? "",
            }));
            resultsRef.current[payload.new.id] = payload.new.result ?? "";

            // resultが存在し、かつR/T/Cでない場合のみterritoryBoardを作成
            if (
              payload.new.result &&
              payload.new.result.length > 2 &&
              payload.new.result[2] !== "R" &&
              payload.new.result[2] !== "T" &&
              payload.new.result[2] !== "C" &&
              boardHistoriesRef.current[payload.new.id] &&
              boardHistoriesRef.current[payload.new.id].length > 0
            ) {
              const territoryBoard = makeTerritoryBoard(
                boardHistoriesRef.current[payload.new.id][
                  boardHistoriesRef.current[payload.new.id].length - 1
                ],
                moveNumbersToStrings(payload.new.dead_stones),
              ).territoryBoard;
              setTerritoryBoards((prev) => ({
                ...prev,
                [payload.new.id]: territoryBoard,
              }));
              territoryBoardsRef.current[payload.new.id] = territoryBoard;
            }
          }
        },
      );
    });

    channel.subscribe();
    channelRef.current = channel;
  };

  // Pull-to-Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    const data = await fetchMatches();
    if (data) {
      const ids = data.map((m) => m.id);
      matchIdsRef.current = ids;
      setupSubscription(ids);
    }
  };

  // 今何手目見てるかをstateとrefに記録する関数
  const handleReplayIndexChange = (matchId: string, newIndex: number) => {
    setReplayIndexes((prev) => ({
      ...prev,
      [matchId]: newIndex,
    }));
    replayIndexesRef.current[matchId] = newIndex;
  };

  const renderMatch = (matchId: string) => {
    const boardHistory = boardHistories[matchId] || [initializeBoard()];
    const agehamaHistory = agehamaHistories[matchId] || [
      { black: 0, white: 0 },
    ];
    const territoryBoard =
      territoryBoards[matchId] ||
      Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));

    const replayIndex = replayIndexes[matchId];
    const board = boardHistory[replayIndex] ?? initializeBoard();
    console.log("replayIndex: ", replayIndex);
    console.log("board: ", board);
    const isAtLatest = replayIndex === boardHistory.length - 1;

    const status = statuss[matchId] || "playing";
    const result = results[matchId] || "";

    // 手数履歴を作成（最新手の表示用）
    // const moveHistory = match.moves?.slice(0, replayIndex + 1) || [];

    return (
      <View
        style={[
          styles.matchCard,
          { backgroundColor: colors.card, borderColor: colors.borderColor },
        ]}
        key={matchId}
      >
        {/* 対局情報 */}
        <View style={styles.matchHeader}>
          <View style={styles.playerRow}>
            <PlayerCard
              gumiIndex={blackGumiIndexs[matchId]}
              iconIndex={blackIconIndexs[matchId]}
              name={blackDisplayNames[matchId]}
              points={blackPointss[matchId]}
              color="black"
              time={blackRemainSecondss[matchId]}
              isActive={turns[matchId] === "black" && isAtLatest}
            />
          </View>

          <View style={styles.playerRow}>
            <PlayerCard
              gumiIndex={whiteGumiIndexs[matchId]}
              iconIndex={whiteIconIndexs[matchId]}
              name={whiteDisplayNames[matchId]}
              points={whitePointss[matchId]}
              color="white"
              time={whiteRemainSecondss[matchId]}
              isActive={turns[matchId] === "white" && isAtLatest}
            />
          </View>

          <View>
            {/* ステータスと結果の表示 */}
            {status === "ended" && result && (
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
                  {resultToLanguages(result)}
                </Text>
              </View>
            )}
            {status === "playing" && (
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t("Watch.playing")}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 碁盤 + リプレイコントロール */}
        <GoBoardWithReplay
          agehamaHistory={agehamaHistory}
          board={board}
          onPutStone={() => {}} // 観戦モードなので着手不可
          moveHistory={movess[matchId] ?? []}
          disabled={true}
          territoryBoard={territoryBoard}
          isGameEnded={true} // 常にリプレイモード
          boardHistory={boardHistory}
          currentIndex={replayIndex}
          onCurrentIndexChange={(newIndex) =>
            handleReplayIndexChange(matchId, newIndex)
          }
        />
      </View>
    );
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
        {Object.keys(boardHistories).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t("Watch.noMatches")}
            </Text>
            <Text style={[styles.pullToRefreshHint, { color: colors.subtext }]}>
              {t("Watch.pullToRefreshHint")}
            </Text>
          </View>
        ) : (
          matchIdsRef.current.map((matchId) => renderMatch(matchId))
        )}
      </ScrollView>
      {/* ローディングオーバーレイ */}
      {loading && <LoadingOverlay text={t("Watch.loading")} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 12,
  },
  pullToRefreshHint: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
  },
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
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // 結果表示のスタイル
  resultContainer: {
    borderRadius: 12,
    marginVertical: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  resultText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  // ステータス表示のスタイル
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
