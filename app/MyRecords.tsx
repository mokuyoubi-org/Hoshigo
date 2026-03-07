import LoadingOverlay from "@/src/components/LoadingOverlay";
import { StarBackground } from "@/src/components/StarBackGround";
import { Agehama, MatchArchive } from "@/src/constants/goConstants";
import { moveNumbersToStrings } from "@/src/lib/utils";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoBoard } from "../src/components/GoBoard";
import { PlayerCard } from "../src/components/PlayerCard";
import { UidContext } from "../src/components/UserContexts";
import { useTheme } from "../src/hooks/useTheme";
import { Board } from "../src/lib/goLogics";
import {
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToLanguages,
} from "../src/lib/goUtils";
import { supabase } from "../src/services/supabase";
import { BACKGROUND, CHOCOLATE, CHOCOLATE_SUB, STRAWBERRY } from "@/src/constants/colors";



export default function MyRecords() {
  const { t, i18n } = useTranslation();
  const uid = useContext(UidContext);
  const { colors } = useTheme();

  // ── ロジック（変更なし） ──
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
  const [matchTypes, setMatchTypes] = useState<{ [key: string]: number }>({});
  const fadeIn = useRef(new Animated.Value(0)).current;

  const localeMap: { [key: string]: string } = {
    ja: "ja-JP",
    en: "en-US",
    zh: "zh-CN",
    ko: "ko-KR",
  };
  const currentLocale = localeMap[i18n.language] || "en-US";

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

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
      setLoading(false);

      fetchedRecords.forEach((record: MatchArchive, index: number) => {
        setTimeout(() => {
          const newMoves = moveNumbersToStrings(record.moves);
          const newDeadStones = moveNumbersToStrings(record.dead_stones);
          const { boardHistory, agehamaHistory } = movesToBoardHistory(
            9,
            record.match_type,
            newMoves || [],
          );
          const territoryBoard = !newDeadStones
            ? Array.from({ length: 9 }, () =>
                Array.from({ length: 9 }, () => 0),
              )
            : makeTerritoryBoard(
                9,
                boardHistory[boardHistory.length - 1],
                newDeadStones,
                record.match_type,
                0,
                0,
              ).territoryBoard;

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
          setMatchTypes((prev) => ({
            ...prev,
            [record.id]: record.match_type,
          }));
          setCurrentIndexes((prev) => ({ ...prev, [record.id]: 0 }));
        }, index * 50);
      });
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  // ── RecordCard（UIのみ変更） ──
  const RecordCard = React.memo(
    ({
      record,
      boardHistory,
      moves,
      agehamaHistory,
      territoryBoard,
      t,
      currentLocale,
      matchType,
      index,
    }: {
      record: MatchArchive;
      boardHistory: Board[];
      moves: string[];
      agehamaHistory: Agehama[];
      territoryBoard: number[][] | undefined;
      colors: any;
      t: any;
      currentLocale: string;
      matchType: number;
      index: number;
    }) => {
      const [replayIndex, setReplayIndex] = useState(0);
      const cardFade = useRef(new Animated.Value(0)).current;
      const { height } = useWindowDimensions();

      useEffect(() => {
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 400,
          delay: index * 80,
          useNativeDriver: true,
        }).start();
      }, []);

      const board = boardHistory[replayIndex] || {};
      const moveHistory = moves?.slice(0, replayIndex + 1) || [];

      // ローディング中
      if (!territoryBoard) {
        return (
          <Animated.View style={[styles.recordCard, { opacity: cardFade }]}>
            <View style={styles.cardAccentLine} />
            <View style={styles.loadingCard}>
              <View style={styles.loadingDot} />
              <Text style={styles.loadingText}>{t("MyRecords.loading")}</Text>
            </View>
          </Animated.View>
        );
      }

      const dateStr = new Date(record.created_at).toLocaleDateString(
        currentLocale,
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );

      return (
        <Animated.View style={[styles.recordCard, { opacity: cardFade }]}>
          {/* 上部アクセントライン */}
          <View style={styles.cardAccentLine} />

          {/* ヘッダー：プレイヤー・結果・日付 */}
          <View style={styles.recordHeader}>
            {/* 黒番 */}
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

            {/* 中央：結果・日付 */}
            <View style={styles.resultBlock}>
              <View style={styles.resultBadge}>
                <Text style={styles.resultText}>
                  {resultToLanguages(record.result || "") ||
                    t("MyRecords.unknown")}
                </Text>
              </View>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>

            {/* 白番 */}
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
          </View>

          {/* 碁盤 */}
          <View style={styles.boardWrapper}>
            <GoBoard
              boardWidth={(height * 36) / 100}
              matchType={matchType}
              agehamaHistory={agehamaHistory}
              board={board}
              onPutStone={() => {}}
              moveHistory={moveHistory}
              territoryBoard={territoryBoard}
              disabled={true}
              isGameEnded={true}
              boardHistory={boardHistory}
              currentIndex={replayIndex}
              onCurrentIndexChange={setReplayIndex}
            />
          </View>
        </Animated.View>
      );
    },
  );

  const renderItem = useCallback(
    ({ item: record, index }: { item: MatchArchive; index: number }) => (
      <RecordCard
        record={record}
        boardHistory={boardHistories[record.id] || []}
        moves={movess[record.id] || []}
        agehamaHistory={agehamaHistories[record.id] || []}
        territoryBoard={territoryBoards[record.id]}
        colors={colors}
        t={t}
        currentLocale={currentLocale}
        matchType={matchTypes[record.id]}
        index={index}
      />
    ),
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

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      <StarBackground />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* ページヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("MyRecords.back")}</Text>
          </TouchableOpacity>
        </View>

        {/* リスト */}
        <FlatList
          pagingEnabled={true}       // ← これで一枚ずつスクロールになるにゃん
  snapToAlignment="start"    // スクロール位置をぴったり合わせる
  decelerationRate="fast"    // スワイプの止まり方を自然に
          data={records}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={
            records.length === 0 ? styles.emptyContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyInner}>
                <View style={styles.emptyIcon}>
                  <View style={styles.emptyIconInner} />
                </View>
                <Text style={styles.emptyText}>{t("MyRecords.empty")}</Text>
              </View>
            ) : null
          }
        />
      </Animated.View>

      {loading && <LoadingOverlay text={t("MyRecords.loading")} />}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    paddingVertical: 4,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageTitleAccent: {
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: STRAWBERRY,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1.5,
  },
  headerSpacer: { minWidth: 60 },

  // リスト
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
  },
  emptyInner: {
    alignItems: "center",
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
    fontSize: 15,
    color: CHOCOLATE,
    letterSpacing: 0.8,
    fontWeight: "600",
  },

  // レコードカード
  recordCard: {
    alignItems: "center",
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

  // ローディングカード
  loadingCard: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: STRAWBERRY,
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 13,
    color: CHOCOLATE_SUB,
    letterSpacing: 1,
  },

  // レコードヘッダー
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
    backgroundColor: "rgba(249,250,251,0.8)",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // 結果・日付ブロック
  resultBlock: {
    alignItems: "center",
    gap: 6,
  },
  resultBadge: {
    backgroundColor: "rgba(200,214,230,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultText: {
    fontSize: 13,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: CHOCOLATE_SUB,
    letterSpacing: 0.3,
    fontWeight: "600",
  },

  // 碁盤ラッパー
  boardWrapper: {
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(200,214,230,0.12)",
    backgroundColor: "#fafbfc",
  },
});
