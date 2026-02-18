import LoadingOverlay from "@/src/components/LoadingOverlay";
import { moveNumbersToStrings } from "@/src/lib/utils";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList, // ← ScrollView から変更
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoBoardWithReplay } from "../src/components/GoBoardWithReplay";
import { PlayerCard } from "../src/components/PlayerCard";
import { UidContext } from "../src/components/UserContexts";
import { useTheme } from "../src/hooks/useTheme";
import { Board } from "../src/lib/goLogics";
import {
  Agehama,
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToLanguages,
} from "../src/lib/goUtils";
import { supabase } from "../src/services/supabase";

type MatchArchive = {
  id: string;
  black_uid: string;
  white_uid: string | null;
  created_at: string;
  black_points: number;
  white_points: number;
  black_username: string;
  white_username: string | null;
  black_displayname: string;
  white_displayname: string | null;
  black_icon_index: number;
  white_icon_index: number;
  black_gumi_index: number;
  white_gumi_index: number;
  result: string | null;
  moves: number[];
  dead_stones: number[];
};

export default function MyRecords() {
  const { t, i18n } = useTranslation();
  const uid = useContext(UidContext);
  const [records, setRecords] = useState<MatchArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndexes, setCurrentIndexes] = useState<{
    [key: string]: number;
  }>({});
  const [boardHistories, setBoardHistories] = useState<{
    [key: string]: Board[];
  }>({});
  const [movess, setMovess] = useState<{ [key: string]: string[] }>({});
  const [agehamaHistories, setAgehamaHistories] = useState<{
    [key: string]: Agehama[];
  }>({});
  const [territoryBoards, setTerritoryBoards] = useState<{
    [key: string]: number[][];
  }>({});
  const { colors } = useTheme();

  const localeMap: { [key: string]: string } = {
    ja: "ja-JP",
    en: "en-US",
    zh: "zh-CN",
    ko: "ko-KR",
  };
  const currentLocale = localeMap[i18n.language] || "en-US";

  useEffect(() => {
    fetchRecords();
  }, [uid]);

  const fetchRecords = async () => {
    if (!uid) return;

    try {
      const { data, error } = await supabase
        .from("matches_archive")
        .select("*")
        .or(`black_uid.eq.${uid},white_uid.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching records:", error);
        return;
      }

      const fetchedRecords = data || [];
      setRecords(fetchedRecords);
      setLoading(false); // ② データ取得できたらすぐローディング解除→画面を先に表示

      // ③ 棋譜計算を1件ずつ非同期で行い、UIをブロックしない
      fetchedRecords.forEach((record: MatchArchive, index: number) => {
        setTimeout(() => {
          const newMoves = moveNumbersToStrings(record.moves);
          const newDeadStones = moveNumbersToStrings(record.dead_stones);

          const { boardHistory, agehamaHistory } = movesToBoardHistory(
            newMoves || [],
          );

          const territoryBoard = !newDeadStones
            ? Array.from({ length: 9 }, () =>
                Array.from({ length: 9 }, () => 0),
              )
            : makeTerritoryBoard(
                boardHistory[boardHistory.length - 1],
                newDeadStones,
              ).territoryBoard;

          // stateを1件ずつ更新（部分的に表示が進む）
          setBoardHistories((prev) => ({ ...prev, [record.id]: boardHistory }));
          setMovess((prev) => ({ ...prev, [record.id]: newMoves }));
          setAgehamaHistories((prev) => ({
            ...prev,
            [record.id]: agehamaHistory,
          }));
          setTerritoryBoards((prev) => ({
            ...prev,
            [record.id]: territoryBoard,
          }));
          setCurrentIndexes((prev) => ({ ...prev, [record.id]: 0 }));
        }, index * 50); // 50msずつずらして処理（UIスレッドの詰まりを防ぐ）
      });
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  // ① RecordCard内でindexを自己管理
  const RecordCard = React.memo(
    ({
      record,
      boardHistory,
      moves,
      agehamaHistory,
      territoryBoard,
      colors,
      t,
      currentLocale,
      // onIndexChange と replayIndex は不要になる！
    }: {
      record: MatchArchive;
      boardHistory: Board[];
      moves: string[];
      agehamaHistory: Agehama[];
      territoryBoard: number[][] | undefined;
      colors: any;
      t: any;
      currentLocale: string;
    }) => {
      // ここでローカルstateとして管理
      const [replayIndex, setReplayIndex] = useState(0);

      const board = boardHistory[replayIndex] || {};
      const moveHistory = moves?.slice(0, replayIndex + 1) || [];

      if (!territoryBoard) {
        return (
          <View
            style={[
              styles.recordCard,
              {
                backgroundColor: colors.card,
                justifyContent: "center",
                alignItems: "center",
                height: 200,
              },
            ]}
          >
            <Text style={{ color: colors.subtext }}>{t("MyRecords.loading")}</Text>
          </View>
        );
      }

      return (
        <View style={[styles.recordCard, { backgroundColor: colors.card }]}>
          <View style={styles.recordHeader}>
            <View style={styles.playerRow}>
              <PlayerCard
                gumiIndex={record.black_gumi_index}
                iconIndex={record.black_icon_index}
                username={record.black_username}
                displayname={record.black_displayname}
                points={record.black_points}
                color="black"
              />
            </View>
            <View style={styles.playerRow}>
              <PlayerCard
                gumiIndex={record.white_gumi_index}
                iconIndex={record.white_icon_index}
                username={record.white_username || t("MyRecords.cpu")}
                displayname={record.white_displayname || t("MyRecords.cpu")}
                points={record.white_points}
                color="white"
              />
            </View>
            <View style={styles.resultAndDate}>
              <Text style={[styles.resultText, { color: colors.text }]}>
                {resultToLanguages(record.result || "") ||
                  t("MyRecords.unknown")}
              </Text>
              <Text style={[styles.dateText, { color: colors.subtext }]}>
                {new Date(record.created_at).toLocaleDateString(currentLocale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>

          <GoBoardWithReplay
            agehamaHistory={agehamaHistory}
            board={board}
            onPutStone={() => {}}
            moveHistory={moveHistory}
            territoryBoard={territoryBoard}
            disabled={true}
            isGameEnded={true}
            boardHistory={boardHistory}
            currentIndex={replayIndex}
            onCurrentIndexChange={setReplayIndex} // ← そのままsetStateを渡せる
          />
        </View>
      );
    },
  );

  // ④ renderItemをuseCallbackでメモ化
  const renderItem = useCallback(
    ({ item: record }: { item: MatchArchive }) => {
      const boardHistory = boardHistories[record.id] || [];
      const moves = movess[record.id] || [];
      const agehamaHistory = agehamaHistories[record.id] || [];
      const territoryBoard = territoryBoards[record.id];

      return (
        <RecordCard
          record={record}
          boardHistory={boardHistory}
          moves={moves}
          agehamaHistory={agehamaHistory}
          territoryBoard={territoryBoard}
          colors={colors}
          t={t}
          currentLocale={currentLocale}
        />
      );
    },
    [
      boardHistories,
      movess,
      agehamaHistories,
      territoryBoards,
      colors,
      t,
      currentLocale,
    ],
  );

  const keyExtractor = useCallback((item: MatchArchive) => item.id, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="auto" />

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.backButtonText, { color: colors.active }]}>
            ‹ {t("MyRecords.back")}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("MyRecords.title")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ⑤ ScrollView → FlatList に変更（画面外は描画しない） */}
      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          records.length === 0 ? styles.emptyContainer : styles.scrollContent
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t("MyRecords.empty")}
            </Text>
          ) : null
        }
      />

      {loading && <LoadingOverlay text={t("MyRecords.loading")} />}
    </SafeAreaView>
  );
}

// stylesは元のまま
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: { paddingVertical: 8, minWidth: 60 },
  backButtonText: { fontSize: 18, fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.5 },
  headerSpacer: { minWidth: 60 },
  scrollContent: { paddingVertical: 16 },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 16 },
  recordCard: {
    marginHorizontal: 8,
    marginBottom: 18,
    borderRadius: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  recordHeader: { flexDirection: "row", justifyContent: "space-evenly" },
  resultAndDate: { flexDirection: "column", justifyContent: "space-evenly" },
  playerRow: { flexDirection: "row", alignItems: "center" },
  resultText: { fontSize: 14, fontWeight: "500" },
  dateText: { fontSize: 13 },
});
