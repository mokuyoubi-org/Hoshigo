import { StarBackground } from "@/src/components/backGrounds/StarBackGround";
import { PaywallModal } from "@/src/components/modals/MyRecordsPaywallModal";
import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { Agehama, MatchArchive } from "@/src/constants/goConstants";
import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";
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
import {
  FlatList,
  Modal,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoBoard } from "../src/components/goComponents/GoBoard";
import { PlayerCard } from "../src/components/goComponents/PlayerCard";
import CustomPaywallScreen from "../src/components/sheets/CustomPayWallSheet";
import { IsPremiumContext, UidContext } from "../src/contexts/UserContexts";
import { useTheme } from "../src/hooks/useTheme";
import { Board } from "../src/lib/goLogics";
import {
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToLanguages,
} from "../src/lib/goUtils";
import { supabase } from "../src/services/supabase";

// ─── ゴーストカード（11枚目・ぼかし＋モーダル） ──────────────
const GhostPaywallCard = ({
  setShowPaywall,
  record,
  boardHistory,
  moves,
  agehamaHistory,
  territoryBoard,
  matchType,
  cardHeight,
  t,
  currentLocale,
}: {
  setShowPaywall: any;
  record: MatchArchive | null;
  boardHistory: Board[];
  moves: string[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][] | undefined;
  matchType: number;
  cardHeight: number;
  t: any;
  currentLocale: string;
}) => {
  const { height } = useWindowDimensions();
  const board = boardHistory[0] || {};
  const moveHistory = moves?.slice(0, 1) || [];

  const dateStr = record
    ? new Date(record.created_at).toLocaleDateString(currentLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "----/--/--";

  return (
    <View style={[ghostStyles.wrapper, { height: cardHeight }]}>
      {/* 実カードと同じ見た目（操作不可） */}
      <View style={ghostStyles.cardContent} pointerEvents="none">
        <View style={ghostStyles.accentLine} />
        <View style={ghostStyles.recordHeader}>
          <View style={ghostStyles.playerRow}>
            {record ? (
              <PlayerCard
                gumiIndex={record.black_gumi_index}
                iconIndex={record.black_icon_index}
                username={record.black_username}
                displayname={record.black_displayname}
                points={record.black_points}
                color="black"
              />
            ) : (
              <View style={ghostStyles.dummyPlayer} />
            )}
          </View>
          <View style={ghostStyles.resultBlock}>
            <View style={ghostStyles.resultBadge}>
              <Text style={ghostStyles.resultText}>
                {record ? resultToLanguages(record.result || "") || "?" : "---"}
              </Text>
            </View>
            <Text style={ghostStyles.dateText}>{dateStr}</Text>
          </View>
          <View style={ghostStyles.playerRow}>
            {record ? (
              <PlayerCard
                gumiIndex={record.white_gumi_index}
                iconIndex={record.white_icon_index}
                username={record.white_username || t("MyRecords.cpu")}
                displayname={record.white_displayname || t("MyRecords.cpu")}
                points={record.white_points}
                color="white"
              />
            ) : (
              <View style={ghostStyles.dummyPlayer} />
            )}
          </View>
        </View>
        <View style={ghostStyles.boardWrapper}>
          {territoryBoard ? (
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
              currentIndex={0}
              onCurrentIndexChange={() => {}}
            />
          ) : (
            <View style={{ height: (height * 36) / 100 }} />
          )}
        </View>
      </View>

      {/* ぼかし層 */}
      <View style={ghostStyles.blurOverlay} />

      {/* モーダル */}
      <PaywallModal t={t} setShowPaywall={setShowPaywall} />
    </View>
  );
};

const ghostStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
  },
  accentLine: {
    height: 2.5,
    width: "100%",
    backgroundColor: STRAWBERRY,
    opacity: 0.6,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
    backgroundColor: "rgba(249,250,251,0.8)",
    width: "100%",
  },
  playerRow: { flexDirection: "row", alignItems: "center" },
  dummyPlayer: {
    width: 80,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(200,214,230,0.2)",
  },
  resultBlock: { alignItems: "center", gap: 6 },
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
  boardWrapper: {
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(200,214,230,0.12)",
    backgroundColor: "#fafbfc",
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(252,249,244,0.78)",
  },
});

// プレースホルダーIDのプレフィックス
const PLACEHOLDER_PREFIX = "__placeholder__";
const makePlaceholders = (count: number): MatchArchive[] =>
  Array.from(
    { length: count },
    (_, i) => ({ id: `${PLACEHOLDER_PREFIX}${i}` }) as MatchArchive,
  );

// ─── 静的スケルトンカード（アニメなし・Web/ネイティブ共通） ──
const SkeletonCard = ({ cardHeight }: { cardHeight: number }) => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.accentLine} />
    {/* ヘッダー */}
    <View style={skeletonStyles.header}>
      <View
        style={[
          skeletonStyles.block,
          { width: 72, height: 48, borderRadius: 10 },
        ]}
      />
      <View
        style={[
          skeletonStyles.block,
          { width: 56, height: 32, borderRadius: 8 },
        ]}
      />
      <View
        style={[
          skeletonStyles.block,
          { width: 72, height: 48, borderRadius: 10 },
        ]}
      />
    </View>
    {/* 碁盤エリア */}
    <View style={[skeletonStyles.boardArea, { height: cardHeight }]}>
      <View
        style={[
          skeletonStyles.block,
          { width: 200, height: 200, borderRadius: 6 },
        ]}
      />
    </View>
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
  },
  accentLine: {
    height: 2.5,
    width: "100%",
    backgroundColor: "rgba(200,214,230,0.4)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.12)",
    backgroundColor: "rgba(249,250,251,0.8)",
  },
  boardArea: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafbfc",
    gap: 16,
  },
  block: {
    backgroundColor: "rgba(200,214,230,0.3)",
  },
  loadingText: {
    fontSize: 13,
    color: CHOCOLATE_SUB,
    letterSpacing: 0.5,
  },
});

// ─── メインコンポーネント ──────────────────────────────────
export default function MyRecords() {
  const uid = useContext(UidContext);
  const isPremium = useContext(IsPremiumContext);
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const lang = useContext(LangContext);

  const CARD_HEIGHT = height * 0.8;
  const GAP = 18;
  const SNAP_INTERVAL = CARD_HEIGHT + GAP;

  // ページを開いた瞬間から10枚のスケルトンが表示される
  const [records, setRecords] = useState<MatchArchive[]>(makePlaceholders(10));
  const [ghostRecord, setGhostRecord] = useState<MatchArchive | null>(null);
  const [hasMore, setHasMore] = useState(true);
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
  const { t } = useTranslation();
  const isFetchingMore = useRef(false);

  // const localeMap: { [key: string]: string } = {
  //   ja: "ja-JP",
  //   en: "en-US",
  //   zh: "zh-CN",
  //   ko: "ko-KR",
  // };
  // const currentLocale = localeMap[lang] || "en-US";

  useEffect(() => {
    if (uid) fetchRecords(0);
  }, [uid]);

  // isPremium が変化したとき（アプリ内課金完了など）に再fetch
  useEffect(() => {
    if (uid) fetchRecords(0);
  }, [isPremium]);

  /**
   * fetch ロジック
   *
   * 無料会員：offset=0 のとき11件取る
   *   → 11件返ってきた場合：先頭10件を表示用、11件目をゴーストカード用に分ける
   *   → 10件以下：それだけ表示（ゴーストなし）
   *
   * 有料会員：常に10件ずつ取る
   *   → fetch完了直後にレコードをリストに追加（= カードが「読み込み中」状態で即座に出現）
   *   → processRecords が非同期で boardHistory を埋めていくと順に完成していく
   *   → 返ってきた件数が10未満 → hasMore = false（末尾）
   */
  const fetchRecords = async (offset: number) => {
    if (!uid) return;
    try {
      const fetchCount = !isPremium && offset === 0 ? 11 : 10;
      const { data, error } = await supabase
        .from("matches_archive")
        .select("*")
        .or(`black_uid.eq.${uid},white_uid.eq.${uid}`)
        .order("created_at", { ascending: false })
        .range(offset, offset + fetchCount - 1);

      if (error) {
        console.error("Error fetching records:", error);
        isFetchingMore.current = false;
        return;
      }

      const fetched = data || [];

      if (!isPremium && offset === 0) {
        // 無料会員の初回fetch
        if (fetched.length === 0) {
          // 対局なし → プレースホルダーをクリアして空表示
          setRecords([]);
          setGhostRecord(null);
          setHasMore(false);
        } else if (fetched.length === 11) {
          const display = fetched.slice(0, 10);
          const ghost = fetched[10];
          setRecords(display);
          setGhostRecord(ghost);
          setHasMore(false);
          processRecords(display);
          processRecords([ghost]);
        } else {
          setRecords(fetched);
          setGhostRecord(null);
          setHasMore(false);
          processRecords(fetched);
        }
      } else {
        // 有料会員：
        // fetch完了 → プレースホルダーを実データで置き換える
        const isFirst = offset === 0;
        if (fetched.length === 0 && isFirst) {
          // 対局なし → プレースホルダーをクリアして空表示
          setRecords([]);
        } else {
          setRecords((prev) => {
            const real = prev.filter(
              (r) => !r.id.startsWith(PLACEHOLDER_PREFIX),
            );
            return isFirst ? fetched : [...real, ...fetched];
          });
          processRecords(fetched);
        }
        setHasMore(fetched.length === 10);
      }

      isFetchingMore.current = false;
    } catch (error) {
      console.error("Error:", error);
      isFetchingMore.current = false;
    }
  };

  // boardHistory などの計算を共通化
  const processRecords = (list: MatchArchive[]) => {
    list.forEach((record: MatchArchive, index: number) => {
      setTimeout(() => {
        const newMoves = moveNumbersToStrings(record.moves);
        const newDeadStones = moveNumbersToStrings(record.dead_stones);
        const { boardHistory, agehamaHistory } = movesToBoardHistory(
          9,
          record.match_type,
          newMoves || [],
        );
        const territoryBoard = !newDeadStones
          ? Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0))
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
        setMatchTypes((prev) => ({ ...prev, [record.id]: record.match_type }));
      }, index * 50);
    });
  };

  // スクロール末尾検知（Web・ネイティブ共通）
  const handleScroll = useCallback(
    (event: any) => {
      if (!hasMore || isFetchingMore.current) return;

      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;

      if (distanceFromBottom < SNAP_INTERVAL * 1.5) {
        isFetchingMore.current = true;
        // fetch前にプレースホルダーを10枚追加 → すぐスケルトンが見える
        const currentRealCount = records.filter(
          (r) => !r.id.startsWith(PLACEHOLDER_PREFIX),
        ).length;
        setRecords((prev) => [
          ...prev.filter((r) => !r.id.startsWith(PLACEHOLDER_PREFIX)),
          ...makePlaceholders(10),
        ]);
        fetchRecords(currentRealCount);
      }
    },
    [hasMore, records, SNAP_INTERVAL],
  );

  // ── RecordCard ──
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
      cardHeight,
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
      cardHeight: number;
    }) => {
      const [replayIndex, setReplayIndex] = useState(0);

      const isPlaceholder = record.id.startsWith(PLACEHOLDER_PREFIX);
      const board = boardHistory[replayIndex] || {};
      const moveHistory = moves?.slice(0, replayIndex + 1) || [];
      const dateStr = !isPlaceholder
        ? new Date(record.created_at).toLocaleDateString(currentLocale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "";

      // スケルトン表示条件：プレースホルダー OR boardHistory未計算
      const showSkeleton = isPlaceholder || !territoryBoard;

      if (showSkeleton) {
        return <SkeletonCard cardHeight={cardHeight} />;
      }

      return (
        <View style={[styles.recordCard, { height: cardHeight }]}>
          <View style={styles.cardAccentLine} />
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
            <View style={styles.resultBlock}>
              <View style={styles.resultBadge}>
                <Text style={styles.resultText}>
                  {resultToLanguages(record.result || "") ||
                    t("MyRecords.unknown")}
                </Text>
              </View>
              <Text style={styles.dateText}>{dateStr}</Text>
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
          </View>
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
        </View>
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
        currentLocale={lang}
        matchType={matchTypes[record.id]}
        index={index}
        cardHeight={CARD_HEIGHT}
      />
    ),
    [
      boardHistories,
      movess,
      agehamaHistories,
      territoryBoards,
      colors,
      t,
      lang,
      CARD_HEIGHT,
    ],
  );
  const [showPaywall, setShowPaywall] = useState(false);

  const keyExtractor = useCallback((item: MatchArchive) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      <StarBackground />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("MyRecords.back")}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          pagingEnabled={true}
          data={records}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: CARD_HEIGHT,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          contentContainerStyle={
            records.length === 0 ? styles.emptyContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={() => {
            // ネイティブ用フォールバック
            if (!hasMore || isFetchingMore.current) return;
            isFetchingMore.current = true;
            const currentRealCount = records.filter(
              (r) => !r.id.startsWith(PLACEHOLDER_PREFIX),
            ).length;
            setRecords((prev) => [
              ...prev.filter((r) => !r.id.startsWith(PLACEHOLDER_PREFIX)),
              ...makePlaceholders(10),
            ]);
            fetchRecords(currentRealCount);
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <View style={styles.emptyIcon}>
                <View style={styles.emptyIconInner} />
              </View>
              <Text style={styles.emptyText}>{t("MyRecords.empty")}</Text>
            </View>
          }
          // 11枚目 = ゴーストカード（無料会員のみ表示）
          ListFooterComponent={
            ghostRecord ? (
              <GhostPaywallCard
                setShowPaywall={setShowPaywall}
                record={ghostRecord}
                boardHistory={boardHistories[ghostRecord.id] || []}
                moves={movess[ghostRecord.id] || []}
                agehamaHistory={agehamaHistories[ghostRecord.id] || []}
                territoryBoard={territoryBoards[ghostRecord.id]}
                matchType={matchTypes[ghostRecord.id] ?? 0}
                cardHeight={CARD_HEIGHT}
                t={t}
                currentLocale={lang}
              />
            ) : null
          }
        />

        {/* 🆕 Paywall Modal */}
        <Modal
          visible={showPaywall}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPaywall(false)}
        >
          <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} />
        </Modal>
      </View>
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
    width: "100%",
    backgroundColor: STRAWBERRY,
    opacity: 0.6,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
    backgroundColor: "rgba(249,250,251,0.8)",
    width: "100%",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  boardWrapper: {
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(200,214,230,0.12)",
    backgroundColor: "#fafbfc",
  },
});
