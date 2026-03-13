import { StarBackground } from "@/src/components/backGrounds/StarBackGround";
import { GhostCard } from "@/src/components/cards/GhostCard";
import { RecordCard } from "@/src/components/cards/RecordCard";
import { BACKGROUND, CHOCOLATE, STRAWBERRY } from "@/src/constants/colors";
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
import CustomPaywallScreen from "../src/components/sheets/CustomPayWallSheet";
import { IsPremiumContext, UidContext } from "../src/contexts/UserContexts";
import { Board } from "../src/lib/goLogics";
import { makeTerritoryBoard, movesToBoardHistory } from "../src/lib/goUtils";
import { supabase } from "../src/services/supabase";

// ─── 定数 ────────────────────────────────────────────────
const FETCH_COUNT = 10;
const PLACEHOLDER_ID_OFFSET = -1;

const makePlaceholders = (n: number): MatchArchive[] =>
  Array.from(
    { length: n },
    (_, i) => ({ id: PLACEHOLDER_ID_OFFSET - i }) as MatchArchive,
  );

const isPlaceholder = (r: MatchArchive) => (r.id as number) < 0;

// ─── メイン ──────────────────────────────────────────────
export default function MyRecords() {
  const uid = useContext(UidContext);
  const isPremium = useContext(IsPremiumContext);
  // const isPremium = true;

  const lang = useContext(LangContext);
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  const CARD_HEIGHT = height * 0.72;
  const SNAP_INTERVAL = CARD_HEIGHT + 18;

  const [records, setRecords] = useState<MatchArchive[]>(
    makePlaceholders(FETCH_COUNT),
  );
  const [showGhost, setShowGhost] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const [boardHistories, setBoardHistories] = useState<Record<string, Board[]>>(
    {},
  );
  const [movess, setMovess] = useState<Record<string, string[]>>({});
  const [agehamaHistories, setAgehamaHistories] = useState<
    Record<string, Agehama[]>
  >({});
  const [territoryBoards, setTerritoryBoards] = useState<
    Record<string, number[][]>
  >({});
  const [matchTypes, setMatchTypes] = useState<Record<string, number>>({});

  const isFetchingMore = useRef(false);

  useEffect(() => {
    if (uid) fetchRecords(0);
  }, [uid, isPremium]);

  const processRecords = useCallback((list: MatchArchive[]) => {
    list.forEach((record, i) =>
      setTimeout(() => {
        const moves = moveNumbersToStrings(record.moves);
        const deadStones = moveNumbersToStrings(record.dead_stones);
        const { boardHistory, agehamaHistory } = movesToBoardHistory(
          9,
          record.match_type,
          moves ?? [],
        );
        const territoryBoard = deadStones
          ? makeTerritoryBoard(
              9,
              boardHistory.at(-1)!,
              deadStones,
              record.match_type,
              0,
              0,
            ).territoryBoard
          : Array.from({ length: 9 }, () => Array(9).fill(0));

        setBoardHistories((p) => ({ ...p, [record.id]: boardHistory }));
        setMovess((p) => ({ ...p, [record.id]: moves }));
        setAgehamaHistories((p) => ({ ...p, [record.id]: agehamaHistory }));
        setTerritoryBoards((p) => ({ ...p, [record.id]: territoryBoard }));
        setMatchTypes((p) => ({ ...p, [record.id]: record.match_type }));
      }, i * 50),
    );
  }, []);

  const fetchRecords = async (offset: number) => {
    if (!uid) return;
    try {
      const { data, error } = await supabase
        .schema("game")
        .rpc("get_records_with_profiles", {
          p_uid: uid,
          p_limit: FETCH_COUNT,
          p_offset: offset,
        });

      if (error) {
        console.error(error);
        isFetchingMore.current = false;
        return;
      }

      const fetched = data ?? [];
      const isFirst = offset === 0;
      const reachedEnd = fetched.length < FETCH_COUNT;

      if (isFirst && fetched.length === 0) {
        setRecords([]);
      } else {
        setRecords((prev) => {
          const real = prev.filter((r) => !isPlaceholder(r));
          return isFirst ? fetched : [...real, ...fetched];
        });
        processRecords(fetched);
      }

      setHasMore(!reachedEnd && !!isPremium);
      if (!isPremium) setShowGhost(true);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingMore.current = false;
    }
  };

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore.current || showGhost) return;
    isFetchingMore.current = true;
    const realCount = records.filter((r) => !isPlaceholder(r)).length;
    setRecords((prev) => [
      ...prev.filter((r) => !isPlaceholder(r)),
      ...makePlaceholders(FETCH_COUNT),
    ]);
    fetchRecords(realCount);
  }, [hasMore, records, showGhost]);

  const handleScroll = useCallback(
    ({ nativeEvent: e }: any) => {
      if (
        e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height <
        SNAP_INTERVAL * 1.5
      )
        loadMore();
    },
    [loadMore, SNAP_INTERVAL],
  );

  const renderItem = useCallback(
    ({ item }: { item: MatchArchive }) => {
      const isBlackPlayer = item.black_uid === uid;
      const blackWins = item.result?.startsWith("B");
      const isWin = isBlackPlayer ? blackWins : !blackWins;

      return (
        <RecordCard
          record={item}
          boardHistory={boardHistories[item.id] ?? []}
          moves={movess[item.id] ?? []}
          agehamaHistory={agehamaHistories[item.id] ?? []}
          territoryBoard={territoryBoards[item.id]}
          matchType={matchTypes[item.id] ?? 0}
          cardHeight={CARD_HEIGHT}
          t={t}
          currentLocale={lang}
          isWin={isPlaceholder(item) ? undefined : isWin}
        />
      );
    },
    [
      /* 既存のdeps */ boardHistories,
      movess,
      agehamaHistories,
      territoryBoards,
      matchTypes,
      CARD_HEIGHT,
      t,
      lang,
    ],
  );
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />
      <StarBackground />

      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>‹ {t("MyRecords.back")}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          pagingEnabled
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, i) => ({
            length: CARD_HEIGHT,
            offset: SNAP_INTERVAL * i,
            index: i,
          })}
          contentContainerStyle={
            records.length === 0
              ? { flex: 1, alignItems: "center", justifyContent: "center" }
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={{ alignItems: "center", gap: 16 }}>
              <View style={styles.emptyIcon}>
                <View style={styles.emptyIconInner} />
              </View>
              <Text style={styles.emptyText}>{t("MyRecords.empty")}</Text>
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
          <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} />
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14 },
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
});
