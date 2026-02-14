// import LoadingOverlay from "@/src/components/LoadingOverlay";
// import { moveNumbersToStrings } from "@/src/lib/utils";
// import { router } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import React, { useContext, useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// import { SafeAreaView } from "react-native-safe-area-context";
// import { GoBoardWithReplay } from "../src/components/GoBoardWithReplay";
// import { PlayerCard } from "../src/components/PlayerCard";
// import { UidContext } from "../src/components/UserContexts";
// import { Board } from "../src/lib/goLogics";
// import {
//   Agehama,
//   makeTerritoryBoard,
//   movesToBoardHistory,
//   resultToLanguages,
// } from "../src/lib/goUtils";
// import { supabase } from "../src/lib/supabase";
// import { useTheme } from "../src/lib/useTheme";
// // カラム数12
// type MatchArchive = {
//   id: string; // 対局自体のid。supabaseが設定。Matchと同じものを使う。uuid(16byte)
//   black_uid: string; // 黒のuid。uuid(16byte)
//   white_uid: string | null; // 白のuid。uuid(16byte)
//   created_at: string; // supabaseが設定。timestamptz(8byte)
//   black_points: number; // 黒のレート。(2byte)
//   white_points: number; // 白のレート。(2byte)
//   black_displayname: string; // 黒の表示名。ひらがな8文字まで(24byte)
//   white_displayname: string | null; // 白の表示名。ひらがな8文字まで(24byte)
//   black_icon_index: number; // 黒のアイコン。(2byte)
//   white_icon_index: number; // 黒のアイコン。(2byte)
//   black_gumi_index: number; // 黒のアイコン。(2byte)
//   white_gumi_index: number; // 黒のアイコン。(2byte)
//   result: string | null; // 結果。(3~6byte)
//   moves: number[]; // 一連の手。
//   dead_stones: number[]; //
// };

// export default function MyRecords() {
//   const { t } = useTranslation();
//   const uid = useContext(UidContext);
//   const [records, setRecords] = useState<MatchArchive[]>([]); // MatchArchiveそのもの
//   const [loading, setLoading] = useState(true);
//   const [currentIndexes, setCurrentIndexes] = useState<{
//     [key: string]: number;
//   }>({}); // 「この対局今何手目?」の情報を、オブジェクトの形で保存。{ "matchA": 30, "matchB": 40}のように
//   const [boardHistories, setBoardHistories] = useState<{
//     // 対局別にboardHistoryを保存している
//     [key: string]: Board[];
//   }>({});
//   const [movess, setMovess] = useState<{
//     // 対局別にmoveHistoryを保存している
//     [key: string]: string[];
//   }>({});
//   const [agehamaHistories, setAgehamaHistories] = useState<{
//     [key: string]: Agehama[];
//   }>({});
//   const [territoryBoards, setTerritoryBoards] = useState<{
//     // 対局別にterritoryBoardを保存している
//     [key: string]: number[][];
//   }>({});
//   const { colors } = useTheme();

//   useEffect(() => {
//     // 棋譜ページを開いてまずやることは、棋譜をとってくること
//     fetchRecords();
//   }, [uid]);

//   const fetchRecords = async () => {
//     if (!uid) return;

//     try {
//       // black_uidもしくはwhite_uidが自分と一致しているものを最新順でmatches_archiveからとってくる
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

//       setRecords(data || []);

//       // 全部のboardHistory、currentIndex、territoryBoardを入れるところ。
//       const currentIndexes_: { [key: string]: number } = {};
//       const boardHistories_: { [key: string]: Board[] } = {};
//       const agehamaHistories_: { [key: string]: Agehama[] } = {};
//       const territoryBoards_: { [key: string]: number[][] } = {};
//       const movess_: { [key: string]: string[] } = {};

//       // 一つのMatchArchiveに行う処理ここから-----------------------------------------------------------------------
//       // recordは仮の変数名。要は、dataはMatchArchiveの配列なので、recordはMatchArchiveということになる。
//       data?.forEach((record: MatchArchive) => {
//         const newMoves = moveNumbersToStrings(record.moves);
//         const newDeadStones = moveNumbersToStrings(record.dead_stones);

//         const boardHistory = movesToBoardHistory(newMoves || []).boardHistory; // movesをboardsに
//         boardHistories_[record.id] = boardHistory; // stateとしてしまっておく
//         movess_[record.id] = newMoves; // stateとしてしまっておく

//         const agehamaHistory = movesToBoardHistory(
//           newMoves || [],
//         ).agehamaHistory; // movesをboardsに
//         console.log("agehamaHistory: ", agehamaHistory);
//         agehamaHistories_[record.id] = agehamaHistory; // stateとしてしまっておく

//         currentIndexes_[record.id] = 0; // この対局の「今何手目」は初期値0にしておく

//         // territoryBoardの設定。dead_stonesがnullなら地計算は行われていないので、全部0のまんま
//         if (!newDeadStones) {
//           territoryBoards_[record.id] = Array.from({ length: 9 }, () =>
//             Array.from({ length: 9 }, () => 0),
//           );
//         } else {
//           const { territoryBoard, result } = makeTerritoryBoard(
//             boardHistory[boardHistory.length - 1],
//             newDeadStones,
//           );
//           territoryBoards_[record.id] = territoryBoard;
//         }
//       });

//       // 一つのRecordArchiveに行う処理ここまで-----------------------------------------------------------------------

//       setCurrentIndexes(currentIndexes_);
//       setBoardHistories(boardHistories_);
//       setMovess(movess_);

//       setAgehamaHistories(agehamaHistories_);
//       setTerritoryBoards(territoryBoards_);
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReplayIndexChange = (recordId: string, newIndex: number) => {
//     setCurrentIndexes((prev) => ({
//       ...prev,
//       [recordId]: newIndex,
//     }));
//   };

//   const renderRecord = (record: MatchArchive) => {
//     const boardHistory = boardHistories[record.id] || [];
//     const moves = movess[record.id] || [];

//     const agehamaHistory = agehamaHistories[record.id] || [];
//     const replayIndex = currentIndexes[record.id] ?? boardHistory.length - 1;
//     const board = boardHistory[replayIndex] || {};
//     const territoryBoard = territoryBoards[record.id];

//     // 手数履歴を作成(最新手の表示用)
//     const moveHistory = moves?.slice(0, replayIndex + 1) || [];

//     return (
//       <View
//         style={[styles.recordCard, { backgroundColor: colors.card }]}
//         key={record.id}
//       >
//         {/* 対局情報ヘッダー */}
//         <View style={styles.recordHeader}>
//           <View style={styles.playerRow}>
//             <PlayerCard
//               gumiIndex={record.black_gumi_index}
//               iconIndex={record.black_icon_index}
//               name={record.black_displayname}
//               points={record.black_points}
//               color="black"
//             />
//           </View>
//           <View style={styles.playerRow}>
//             <PlayerCard
//               gumiIndex={record.white_gumi_index}
//               iconIndex={record.white_icon_index}
//               name={record.white_displayname || t("MyRecords.cpu")}
//               points={record.white_points}
//               color="white"
//             />
//           </View>
//           <View style={styles.resultAndDate}>
//             <Text style={[styles.resultText, { color: colors.text }]}>
//               {resultToLanguages(record.result || "") || t("MyRecords.unknown")}
//             </Text>
//             <Text style={[styles.dateText, { color: colors.subtext }]}>
//               {new Date(record.created_at).toLocaleDateString("ja-JP", {
//                 year: "numeric",
//                 month: "long",
//                 day: "numeric",
//               })}
//             </Text>
//           </View>
//         </View>

//         {/* 碁盤 + リプレイコントロール */}
//         <GoBoardWithReplay
//           agehamaHistory={agehamaHistory}
//           board={board}
//           onPutStone={() => {}} // 観戦モードなので着手不可
//           moveHistory={moveHistory}
//           territoryBoard={territoryBoard}
//           disabled={true}
//           isGameEnded={true} // 常にリプレイモード
//           boardHistory={boardHistory}
//           currentIndex={replayIndex}
//           onCurrentIndexChange={(newIndex) =>
//             handleReplayIndexChange(record.id, newIndex)
//           }
//         />
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView
//       style={[styles.container, { backgroundColor: colors.background }]}
//     >
//       <StatusBar style="auto" />

//       {/* ヘッダー */}
//       <View style={[styles.header, { backgroundColor: colors.card }]}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => router.back()}
//           activeOpacity={0.7}
//         >
//           <Text style={[styles.backButtonText, { color: colors.active }]}>
//             ‹ {t("MyRecords.back")}
//           </Text>
//         </TouchableOpacity>
//         <Text style={[styles.headerTitle, { color: colors.text }]}>
//           {t("MyRecords.title")}
//         </Text>
//         <View style={styles.headerSpacer} />
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//       >
//         {records.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <Text style={[styles.emptyText, { color: colors.subtext }]}>
//               {t("MyRecords.empty")}
//             </Text>
//           </View>
//         ) : (
//           records.map((record) => renderRecord(record))
//         )}
//       </ScrollView>
//       {/* ローディングオーバーレイ */}
//       {loading && <LoadingOverlay text={t("MyRecords.loading")} />}
//     </SafeAreaView>
//   );
// }
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 24,
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e2e8f0",
//   },
//   backButton: {
//     paddingVertical: 8,
//     minWidth: 60,
//   },
//   backButtonText: {
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     letterSpacing: 0.5,
//   },
//   headerSpacer: {
//     minWidth: 60,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingVertical: 16,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   loadingText: {
//     fontSize: 16,
//   },
//   emptyContainer: {
//     padding: 40,
//     alignItems: "center",
//   },
//   emptyText: {
//     fontSize: 16,
//   },
//   recordCard: {
//     marginHorizontal: 8,
//     marginBottom: 18,
//     borderRadius: 20,
//     paddingVertical: 4,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 2,
//   },

//   recordHeader: {
//     flexDirection: "row",
//     justifyContent: "space-evenly",
//   },
//   resultAndDate: {
//     flexDirection: "column",
//     justifyContent: "space-evenly",
//   },
//   playerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   resultText: {
//     fontSize: 14,
//     fontWeight: "500",
//   },
//   dateText: {
//     fontSize: 13,
//   },
// });



import LoadingOverlay from "@/src/components/LoadingOverlay";
import { moveNumbersToStrings } from "@/src/lib/utils";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { GoBoardWithReplay } from "../src/components/GoBoardWithReplay";
import { PlayerCard } from "../src/components/PlayerCard";
import { UidContext } from "../src/components/UserContexts";
import { Board } from "../src/lib/goLogics";
import {
  Agehama,
  makeTerritoryBoard,
  movesToBoardHistory,
  resultToLanguages,
} from "../src/lib/goUtils";
import { supabase } from "../src/lib/supabase";
import { useTheme } from "../src/lib/useTheme";

// カラム数12
type MatchArchive = {
  id: string; // 対局自体のid。supabaseが設定。Matchと同じものを使う。uuid(16byte)
  black_uid: string; // 黒のuid。uuid(16byte)
  white_uid: string | null; // 白のuid。uuid(16byte)
  created_at: string; // supabaseが設定。timestamptz(8byte)
  black_points: number; // 黒のレート。(2byte)
  white_points: number; // 白のレート。(2byte)
  black_displayname: string; // 黒の表示名。ひらがな8文字まで(24byte)
  white_displayname: string | null; // 白の表示名。ひらがな8文字まで(24byte)
  black_icon_index: number; // 黒のアイコン。(2byte)
  white_icon_index: number; // 黒のアイコン。(2byte)
  black_gumi_index: number; // 黒のアイコン。(2byte)
  white_gumi_index: number; // 黒のアイコン。(2byte)
  result: string | null; // 結果。(3~6byte)
  moves: number[]; // 一連の手。
  dead_stones: number[]; //
};

export default function MyRecords() {
  const { t, i18n } = useTranslation();
  const uid = useContext(UidContext);
  const [records, setRecords] = useState<MatchArchive[]>([]); // MatchArchiveそのもの
  const [loading, setLoading] = useState(true);
  const [currentIndexes, setCurrentIndexes] = useState<{
    [key: string]: number;
  }>({}); // 「この対局今何手目?」の情報を、オブジェクトの形で保存。{ "matchA": 30, "matchB": 40}のように
  const [boardHistories, setBoardHistories] = useState<{
    // 対局別にboardHistoryを保存している
    [key: string]: Board[];
  }>({});
  const [movess, setMovess] = useState<{
    // 対局別にmoveHistoryを保存している
    [key: string]: string[];
  }>({});
  const [agehamaHistories, setAgehamaHistories] = useState<{
    [key: string]: Agehama[];
  }>({});
  const [territoryBoards, setTerritoryBoards] = useState<{
    // 対局別にterritoryBoardを保存している
    [key: string]: number[][];
  }>({});
  const { colors } = useTheme();

  useEffect(() => {
    // 棋譜ページを開いてまずやることは、棋譜をとってくること
    fetchRecords();
  }, [uid]);

  const fetchRecords = async () => {
    if (!uid) return;

    try {
      // black_uidもしくはwhite_uidが自分と一致しているものを最新順でmatches_archiveからとってくる
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

      setRecords(data || []);

      // 全部のboardHistory、currentIndex、territoryBoardを入れるところ。
      const currentIndexes_: { [key: string]: number } = {};
      const boardHistories_: { [key: string]: Board[] } = {};
      const agehamaHistories_: { [key: string]: Agehama[] } = {};
      const territoryBoards_: { [key: string]: number[][] } = {};
      const movess_: { [key: string]: string[] } = {};

      // 一つのMatchArchiveに行う処理ここから-----------------------------------------------------------------------
      // recordは仮の変数名。要は、dataはMatchArchiveの配列なので、recordはMatchArchiveということになる。
      data?.forEach((record: MatchArchive) => {
        const newMoves = moveNumbersToStrings(record.moves);
        const newDeadStones = moveNumbersToStrings(record.dead_stones);

        const boardHistory = movesToBoardHistory(newMoves || []).boardHistory; // movesをboardsに
        boardHistories_[record.id] = boardHistory; // stateとしてしまっておく
        movess_[record.id] = newMoves; // stateとしてしまっておく

        const agehamaHistory = movesToBoardHistory(
          newMoves || [],
        ).agehamaHistory; // movesをboardsに
        console.log("agehamaHistory: ", agehamaHistory);
        agehamaHistories_[record.id] = agehamaHistory; // stateとしてしまっておく

        currentIndexes_[record.id] = 0; // この対局の「今何手目」は初期値0にしておく

        // territoryBoardの設定。dead_stonesがnullなら地計算は行われていないので、全部0のまんま
        if (!newDeadStones) {
          territoryBoards_[record.id] = Array.from({ length: 9 }, () =>
            Array.from({ length: 9 }, () => 0),
          );
        } else {
          const { territoryBoard, result } = makeTerritoryBoard(
            boardHistory[boardHistory.length - 1],
            newDeadStones,
          );
          territoryBoards_[record.id] = territoryBoard;
        }
      });

      // 一つのRecordArchiveに行う処理ここまで-----------------------------------------------------------------------

      setCurrentIndexes(currentIndexes_);
      setBoardHistories(boardHistories_);
      setMovess(movess_);

      setAgehamaHistories(agehamaHistories_);
      setTerritoryBoards(territoryBoards_);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplayIndexChange = (recordId: string, newIndex: number) => {
    setCurrentIndexes((prev) => ({
      ...prev,
      [recordId]: newIndex,
    }));
  };

  const renderRecord = (record: MatchArchive) => {
    const boardHistory = boardHistories[record.id] || [];
    const moves = movess[record.id] || [];

    const agehamaHistory = agehamaHistories[record.id] || [];
    const replayIndex = currentIndexes[record.id] ?? boardHistory.length - 1;
    const board = boardHistory[replayIndex] || {};
    const territoryBoard = territoryBoards[record.id];

    // 手数履歴を作成(最新手の表示用)
    const moveHistory = moves?.slice(0, replayIndex + 1) || [];

    // 現在の言語に応じたロケールマッピング
    const localeMap: { [key: string]: string } = {
      ja: "ja-JP",
      en: "en-US",
      zh: "zh-CN",
      ko: "ko-KR",
    };
    
    const currentLocale = localeMap[i18n.language] || "en-US";

    return (
      <View
        style={[styles.recordCard, { backgroundColor: colors.card }]}
        key={record.id}
      >
        {/* 対局情報ヘッダー */}
        <View style={styles.recordHeader}>
          <View style={styles.playerRow}>
            <PlayerCard
              gumiIndex={record.black_gumi_index}
              iconIndex={record.black_icon_index}
              name={record.black_displayname}
              points={record.black_points}
              color="black"
            />
          </View>
          <View style={styles.playerRow}>
            <PlayerCard
              gumiIndex={record.white_gumi_index}
              iconIndex={record.white_icon_index}
              name={record.white_displayname || t("MyRecords.cpu")}
              points={record.white_points}
              color="white"
            />
          </View>
          <View style={styles.resultAndDate}>
            <Text style={[styles.resultText, { color: colors.text }]}>
              {resultToLanguages(record.result || "") || t("MyRecords.unknown")}
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

        {/* 碁盤 + リプレイコントロール */}
        <GoBoardWithReplay
          agehamaHistory={agehamaHistory}
          board={board}
          onPutStone={() => {}} // 観戦モードなので着手不可
          moveHistory={moveHistory}
          territoryBoard={territoryBoard}
          disabled={true}
          isGameEnded={true} // 常にリプレイモード
          boardHistory={boardHistory}
          currentIndex={replayIndex}
          onCurrentIndexChange={(newIndex) =>
            handleReplayIndexChange(record.id, newIndex)
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="auto" />

      {/* ヘッダー */}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t("MyRecords.empty")}
            </Text>
          </View>
        ) : (
          records.map((record) => renderRecord(record))
        )}
      </ScrollView>
      {/* ローディングオーバーレイ */}
      {loading && <LoadingOverlay text={t("MyRecords.loading")} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    paddingVertical: 8,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    minWidth: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
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

  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  resultAndDate: {
    flexDirection: "column",
    justifyContent: "space-evenly",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  resultText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 13,
  },
});