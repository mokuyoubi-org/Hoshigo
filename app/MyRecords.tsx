// import LoadingOverlay from "@/src/components/LoadingOverlay";
// import { moveNumbersToStrings } from "@/src/lib/utils";
// import { router } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import React, { useCallback, useContext, useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   FlatList,
//   StatusBar as RNStatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { GoBoardWithReplay } from "../src/components/GoBoardWithReplay";
// import { PlayerCard } from "../src/components/PlayerCard";
// import { UidContext } from "../src/components/UserContexts";
// import { useTheme } from "../src/hooks/useTheme";
// import { Board } from "../src/lib/goLogics";
// import {
//   Agehama,
//   makeTerritoryBoard,
//   movesToBoardHistory,
//   resultToLanguages,
// } from "../src/lib/goUtils";
// import { supabase } from "../src/services/supabase";

// // ─── 定数 ─────────────────────────────────────────────
// const GOLD = "#c9a84c";
// const BG = "#08080e";

// // ─── 型定義（変更なし） ───────────────────────────────
// type MatchArchive = {
//   id: string;
//   black_uid: string;
//   white_uid: string | null;
//   created_at: string;
//   black_points: number;
//   white_points: number;
//   black_username: string;
//   white_username: string | null;
//   black_displayname: string;
//   white_displayname: string | null;
//   black_icon_index: number;
//   white_icon_index: number;
//   black_gumi_index: number;
//   white_gumi_index: number;
//   result: string | null;
//   moves: number[];
//   dead_stones: number[];
//   match_type: number;
// };

// export default function MyRecords() {
//   const { t, i18n } = useTranslation();
//   const uid = useContext(UidContext);
//   const { colors } = useTheme();

//   // ── ロジック（変更なし） ──
//   const [records, setRecords] = useState<MatchArchive[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentIndexes, setCurrentIndexes] = useState<{
//     [key: string]: number;
//   }>({});
//   const [boardHistories, setBoardHistories] = useState<{
//     [key: string]: Board[];
//   }>({});
//   const [movess, setMovess] = useState<{ [key: string]: string[] }>({});
//   const [agehamaHistories, setAgehamaHistories] = useState<{
//     [key: string]: Agehama[];
//   }>({});
//   const [territoryBoards, setTerritoryBoards] = useState<{
//     [key: string]: number[][];
//   }>({});
//   const [matchTypes, setMatchTypes] = useState<{ [key: string]: number }>({});

//   const localeMap: { [key: string]: string } = {
//     ja: "ja-JP",
//     en: "en-US",
//     zh: "zh-CN",
//     ko: "ko-KR",
//   };
//   const currentLocale = localeMap[i18n.language] || "en-US";

//   useEffect(() => {
//     fetchRecords();
//   }, [uid]);

//   const fetchRecords = async () => {
//     if (!uid) return;
//     try {
//       const { data, error } = await supabase
//         .from("matches_archive")
//         .select("*")
//         .or(`black_uid.eq.${uid},white_uid.eq.${uid}`)
//         .order("created_at", { ascending: false })
//         .limit(10);

//       if (error) {
//         console.error("Error fetching records:", error);
//         return;
//       }

//       const fetchedRecords = data || [];
//       setRecords(fetchedRecords);
//       setLoading(false);

//       fetchedRecords.forEach((record: MatchArchive, index: number) => {
//         setTimeout(() => {
//           const newMoves = moveNumbersToStrings(record.moves);
//           const newDeadStones = moveNumbersToStrings(record.dead_stones);
//           const { boardHistory, agehamaHistory } = movesToBoardHistory(
//             record.match_type,
//             newMoves || [],
//           );
//           const territoryBoard = !newDeadStones
//             ? Array.from({ length: 9 }, () =>
//                 Array.from({ length: 9 }, () => 0),
//               )
//             : makeTerritoryBoard(
//                 boardHistory[boardHistory.length - 1],
//                 newDeadStones,
//                 record.match_type,
//               ).territoryBoard;

//           setBoardHistories((prev) => ({ ...prev, [record.id]: boardHistory }));
//           setMovess((prev) => ({ ...prev, [record.id]: newMoves }));
//           setAgehamaHistories((prev) => ({
//             ...prev,
//             [record.id]: agehamaHistory,
//           }));
//           setTerritoryBoards((prev) => ({
//             ...prev,
//             [record.id]: territoryBoard,
//           }));
//           setMatchTypes((prev) => ({
//             ...prev,
//             [record.id]: record.match_type,
//           }));
//           setCurrentIndexes((prev) => ({ ...prev, [record.id]: 0 }));
//         }, index * 50);
//       });
//     } catch (error) {
//       console.error("Error:", error);
//       setLoading(false);
//     }
//   };

//   // ── RecordCard（UIのみ変更） ──
//   const RecordCard = React.memo(
//     ({
//       record,
//       boardHistory,
//       moves,
//       agehamaHistory,
//       territoryBoard,
//       colors,
//       t,
//       currentLocale,
//       matchType,
//     }: {
//       record: MatchArchive;
//       boardHistory: Board[];
//       moves: string[];
//       agehamaHistory: Agehama[];
//       territoryBoard: number[][] | undefined;
//       colors: any;
//       t: any;
//       currentLocale: string;
//       matchType: number;
//     }) => {
//       const [replayIndex, setReplayIndex] = useState(0);
//       const board = boardHistory[replayIndex] || {};
//       const moveHistory = moves?.slice(0, replayIndex + 1) || [];

//       // ローディング中
//       if (!territoryBoard) {
//         return (
//           <View style={styles.recordCard}>
//             <View style={styles.cardAccentLine} />
//             <View style={styles.loadingCard}>
//               <View style={styles.loadingDot} />
//               <Text style={styles.loadingText}>{t("MyRecords.loading")}</Text>
//             </View>
//           </View>
//         );
//       }

//       const dateStr = new Date(record.created_at).toLocaleDateString(
//         currentLocale,
//         {
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//         },
//       );

//       return (
//         <View style={styles.recordCard}>
//           {/* 上部アクセントライン */}
//           <View style={styles.cardAccentLine} />

//           {/* ヘッダー：プレイヤー・結果・日付 */}
//           <View style={styles.recordHeader}>
//             {/* 黒番 */}
//             <View style={styles.playerRow}>
//               <PlayerCard
//                 gumiIndex={record.black_gumi_index}
//                 iconIndex={record.black_icon_index}
//                 username={record.black_username}
//                 displayname={record.black_displayname}
//                 points={record.black_points}
//                 color="black"
//               />
//             </View>

//             {/* 中央：結果・日付 */}
//             <View style={styles.resultBlock}>
//               <View style={styles.resultBadge}>
//                 <Text style={styles.resultText}>
//                   {resultToLanguages(record.result || "") ||
//                     t("MyRecords.unknown")}
//                 </Text>
//               </View>
//               <Text style={styles.dateText}>{dateStr}</Text>
//             </View>

//             {/* 白番 */}
//             <View style={styles.playerRow}>
//               <PlayerCard
//                 gumiIndex={record.white_gumi_index}
//                 iconIndex={record.white_icon_index}
//                 username={record.white_username || t("MyRecords.cpu")}
//                 displayname={record.white_displayname || t("MyRecords.cpu")}
//                 points={record.white_points}
//                 color="white"
//               />
//             </View>
//           </View>

//           {/* 碁盤 */}
//           <View style={styles.boardWrapper}>
//             <GoBoardWithReplay
//               matchType={matchType}
//               agehamaHistory={agehamaHistory}
//               board={board}
//               onPutStone={() => {}}
//               moveHistory={moveHistory}
//               territoryBoard={territoryBoard}
//               disabled={true}
//               isGameEnded={true}
//               boardHistory={boardHistory}
//               currentIndex={replayIndex}
//               onCurrentIndexChange={setReplayIndex}
//             />
//           </View>
//         </View>
//       );
//     },
//   );

//   const renderItem = useCallback(
//     ({ item: record }: { item: MatchArchive }) => (
//       <RecordCard
//         record={record}
//         boardHistory={boardHistories[record.id] || []}
//         moves={movess[record.id] || []}
//         agehamaHistory={agehamaHistories[record.id] || []}
//         territoryBoard={territoryBoards[record.id]}
//         colors={colors}
//         t={t}
//         currentLocale={currentLocale}
//         matchType={matchTypes[record.id]}
//       />
//     ),
//     [
//       boardHistories,
//       movess,
//       agehamaHistories,
//       territoryBoards,
//       colors,
//       t,
//       currentLocale,
//     ],
//   );

//   const keyExtractor = useCallback((item: MatchArchive) => item.id, []);

//   // ── UI ──
//   return (
//     <SafeAreaView style={styles.container}>
//       <RNStatusBar barStyle="light-content" backgroundColor={BG} />
//       <StatusBar style="light" />

//       {/* 背景グリッド */}
//       <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
//         {Array.from({ length: 5 }).map((_, i) => (
//           <View
//             key={`v${i}`}
//             style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]}
//           />
//         ))}
//         {Array.from({ length: 7 }).map((_, i) => (
//           <View
//             key={`h${i}`}
//             style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]}
//           />
//         ))}
//       </View>

//       {/* ページヘッダー */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => router.back()}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.backButtonText}>‹ {t("MyRecords.back")}</Text>
//         </TouchableOpacity>
//         <View style={styles.pageTitleRow}>
//           <View style={styles.pageTitleAccent} />
//           <Text style={styles.pageTitle}>{t("MyRecords.title")}</Text>
//         </View>
//         <View style={styles.headerSpacer} />
//       </View>

//       {/* リスト */}
//       <FlatList
//         data={records}
//         renderItem={renderItem}
//         keyExtractor={keyExtractor}
//         contentContainerStyle={
//           records.length === 0 ? styles.emptyContainer : styles.listContent
//         }
//         showsVerticalScrollIndicator={false}
//         ListEmptyComponent={
//           !loading ? (
//             <View style={styles.emptyInner}>
//               <View style={styles.emptyIcon}>
//                 <View style={styles.emptyIconInner} />
//               </View>
//               <Text style={styles.emptyText}>{t("MyRecords.empty")}</Text>
//             </View>
//           ) : null
//         }
//       />

//       {loading && <LoadingOverlay text={t("MyRecords.loading")} />}
//     </SafeAreaView>
//   );
// }

// // ─── スタイル ──────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BG,
//   },

//   // 背景グリッド
//   bgLineV: {
//     position: "absolute",
//     top: 0,
//     width: 1,
//     height: "100%",
//     backgroundColor: "rgba(201,168,76,0.05)",
//   },
//   bgLineH: {
//     position: "absolute",
//     left: 0,
//     width: "100%",
//     height: 1,
//     backgroundColor: "rgba(201,168,76,0.05)",
//   },

//   // ページヘッダー
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(201,168,76,0.1)",
//   },
//   backButton: {
//     paddingVertical: 4,
//     minWidth: 60,
//   },
//   backButtonText: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: GOLD,
//     letterSpacing: 0.3,
//   },
//   pageTitleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   pageTitleAccent: {
//     width: 3,
//     height: 20,
//     borderRadius: 2,
//     backgroundColor: GOLD,
//     shadowColor: GOLD,
//     shadowOpacity: 0.8,
//     shadowRadius: 6,
//   },
//   pageTitle: {
//     fontSize: 20,
//     fontWeight: "800",
//     color: "#f0ebe3",
//     letterSpacing: 1.5,
//   },
//   headerSpacer: { minWidth: 60 },

//   // リスト
//   listContent: {
//     paddingHorizontal: 14,
//     paddingTop: 16,
//     paddingBottom: 32,
//     gap: 16,
//   },
//   emptyContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   emptyInner: {
//     alignItems: "center",
//     gap: 14,
//   },
//   emptyIcon: {
//     width: 72,
//     height: 72,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.18)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   emptyIconInner: {
//     width: 44,
//     height: 44,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.12)",
//   },
//   emptyText: {
//     fontSize: 14,
//     color: "rgba(255,255,255,0.3)",
//     letterSpacing: 1,
//   },

//   // レコードカード
//   recordCard: {
//     backgroundColor: "#0d0d16",
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.15)",
//     overflow: "hidden",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.45,
//     shadowRadius: 14,
//     elevation: 8,
//   },
//   cardAccentLine: {
//     height: 2,
//     backgroundColor: GOLD,
//     opacity: 0.5,
//     shadowColor: GOLD,
//     shadowOpacity: 0.8,
//     shadowRadius: 4,
//   },

//   // ローディングカード
//   loadingCard: {
//     height: 180,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 12,
//   },
//   loadingDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: GOLD,
//     opacity: 0.5,
//   },
//   loadingText: {
//     fontSize: 13,
//     color: "rgba(201,168,76,0.4)",
//     letterSpacing: 1,
//   },

//   // レコードヘッダー
//   recordHeader: {
//     flexDirection: "row",
//     justifyContent: "space-evenly",
//     alignItems: "center",
//     paddingHorizontal: 8,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(201,168,76,0.08)",
//   },
//   playerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   // 結果・日付ブロック
//   resultBlock: {
//     alignItems: "center",
//     gap: 6,
//   },
//   resultBadge: {
//     backgroundColor: "rgba(201,168,76,0.1)",
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.2)",
//     borderRadius: 10,
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//   },
//   resultText: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "rgba(240,235,227,0.8)",
//     letterSpacing: 0.5,
//   },
//   dateText: {
//     fontSize: 11,
//     color: "rgba(201,168,76,0.45)",
//     letterSpacing: 0.3,
//   },

//   // 碁盤ラッパー
//   boardWrapper: {
//     borderTopWidth: 1,
//     borderTopColor: "rgba(201,168,76,0.06)",
//   },
// });

import LoadingOverlay from "@/src/components/LoadingOverlay";
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

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

// ─── 型定義（変更なし） ───────────────────────────────
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
  match_type: number;
};

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
            record.match_type,
            newMoves || [],
          );
          const territoryBoard = !newDeadStones
            ? Array.from({ length: 9 }, () =>
                Array.from({ length: 9 }, () => 0),
              )
            : makeTerritoryBoard(
                boardHistory[boardHistory.length - 1],
                newDeadStones,
                record.match_type,
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
            <GoBoardWithReplay
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

      {/* 背景グリッド（優しい色に） */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]}
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]}
          />
        ))}
      </View>

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
          <View style={styles.pageTitleRow}>
            <View style={styles.pageTitleAccent} />
            <Text style={styles.pageTitle}>{t("MyRecords.title")}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* リスト */}
        <FlatList
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.2)",
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
