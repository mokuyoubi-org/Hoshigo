// PlayerRecords.tsx
// お約束
import { NineThirteenButton } from "@/src/active/components/buttons/NineThirteenButton";
import { RecordCard } from "@/src/active/components/cards/RecordCard";
import {
  isSkeletonCard,
  makeSkeletonCard,
} from "@/src/active/components/cards/SkeletonCard";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import {
  generateTerritoryBoard,
  movesToBoardHistory,
  TerritoryBoard,
} from "@/src/active/logics/matchLogics";
import { Agehama, RecordType } from "@/src/active/types/matchTypes";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { Board, BoardSize, Grid } from "@/src/stable/types/goTypes";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "../active/contexts/ProfileContexts";

type ProcessedRecord = {
  boardHistory: Board[];
  moves: Grid[];
  agehamaHistory: Agehama[];
  territoryBoard: TerritoryBoard;
  matchType: number;
};
// ページ本体
export default function MyRecords() {
  // グローバルstate
  const { profile } = useProfile();
  const { uid } = profile;
  // 定数
  const t = useTranslation();
  const { height } = useWindowDimensions();
  const CARD_HEIGHT = height * 0.64;
  const SNAP_INTERVAL = CARD_HEIGHT + 18;
  const FETCH_NUM = 10;

  // state
  // 一番最初の時点で、skeletoncardが10対配置されているのだ。
  const [records, setRecords] = useState<RecordType[]>(
    makeSkeletonCard(FETCH_NUM),
  );
  const [hasMore, setHasMore] = useState(true);
  const [processedRecords, setProcessedRecords] = useState<
    Record<string, ProcessedRecord>
  >({});

  const isFetchingMore = useRef(false); // 今データを取りに行ってる最中かどうか。

  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const boardSizeRef = useRef<BoardSize>(9);

  const handleToggle = (boardSize: BoardSize) => {
    setBoardSize(boardSize);
    boardSizeRef.current = boardSize;
  };

  // ---- recordの情報から、操作可能な形に処理する。 ----
  const processRecords = (list: RecordType[]) => {
    list.forEach((record, i) => {
      setTimeout(() => {
        const moves = record.moves;
        const deadStones = record.dead_stones;
        const { boardHistory, agehamaHistory } = movesToBoardHistory(
          boardSizeRef.current,
          record.match_type,
          moves ?? [],
        );
        const territoryBoard = deadStones
          ? generateTerritoryBoard(
              boardSizeRef.current,
              boardHistory.at(-1)!,
              deadStones,
              record.match_type,
              0,
              0,
            ).territoryBoard
          : Array.from({ length: boardSizeRef.current }, () =>
              Array(boardSizeRef.current).fill(0),
            );

        setProcessedRecords((p) => ({
          ...p,
          [record.id]: {
            boardHistory,
            moves,
            agehamaHistory,
            territoryBoard,
            matchType: record.match_type,
          },
        }));
      }, i * 50);
    });
  };
  // fetchRecords本体
  const fetchRecords = async (offset: number) => {
    //uidがなければ何もしない
    if (!uid) return;

    // ここから処理本体
    try {
      // 要は、まず10件取ってくる。みんな共通で、このページを開いた瞬間。
      const { data, error } = await supabase.rpc("get_records_with_profiles", {
        p_uid: uid, // 一応(将来の拡張のために)他人のも取ってこれるようにuidを要求しているが、不要かも。
        p_limit: FETCH_NUM, // 何個データを取ってくるか。10個。
        p_offset: offset, // offsetはズレという意味。この場合は、どこからデータを取り始めるか。
        p_board_size: boardSizeRef.current,
      });

      // エラーならこれで処理おしまい
      if (error) {
        console.error(error);
        isFetchingMore.current = false;
        return;
      }

      const fetched = data ?? []; // 取得したデータ。
      const isFirst = offset === 0; // 今回が最初のフェッチかどうか。
      const reachedEnd = fetched.length < FETCH_NUM; // 10個とりに行ったのにlengthが10未満ということはデータの最後に達した。

      if (isFirst && fetched.length === 0) {
        // 初めてのフェッチで、かつ何も取ってこなかったということは、まだ一局も打っていないということ。
        setRecords([]); // 棋譜は当然空っぽ。
      } else {
        // そうでなければ何かしらのデータはある
        setRecords((prev) => {
          // スケルトンカードを取り除いて、
          const real = prev.filter((r) => !isSkeletonCard(r));
          // これまで取得したデータを全て合体して格納
          return isFirst ? fetched : [...real, ...fetched];
        });
        processRecords(fetched);
      }

      // もしプラスプランもしくはウルトラプランなら
      setHasMore(!reachedEnd); // 終わりに達していないなら、まだ取ってこれる

      // エラー
    } catch (e) {
      console.error(e);
    } finally {
      // 必ずすること:
      // 処理の終わりに到達したので、「今取りに行ってる最中だよ！」をfalseに直しておく
      isFetchingMore.current = false;
    }
  };

  // 一番最初にやること: fetchRecords
  useEffect(() => {
    if (uid !== null) {
      setRecords(makeSkeletonCard(FETCH_NUM)); // ← サイズ切替時にスケルトンに戻す
      setProcessedRecords({}); // ← 前サイズの処理済みデータをクリア
      fetchRecords(0);
    }
  }, [boardSize]); // このboardSizeは外さない

  // ---- 棋譜を追加で読み込む ----
  const loadMore = () => {
    // 安全ガード。スタートプランであるorもうそもそも棋譜がないor今他の棋譜データを取りに行ってる途中だよ の場合はガード
    if (!hasMore || isFetchingMore.current) return; // 今追加でデータを取りに行ってる最中なら、この関数は呼べない
    isFetchingMore.current = true; // 今追加でデータを取りに行ってる最中だよ！と宣言
    const realCount = records.filter((r) => !isSkeletonCard(r)).length; // recordsはスケルトン含む、今取得してる全てのrecordcard。そこからスケルトンを取り除いたのがrealCount
    // ここで、待たせるので一旦スケルトンカードを追加
    setRecords((prev) => [
      ...prev.filter((r) => !isSkeletonCard(r)),
      ...makeSkeletonCard(FETCH_NUM),
    ]);
    fetchRecords(realCount); // そんなrealCountの一つ次の要素から探しに行けという意味
  };
  // ---- スクロールした時の処理 ----
  const handleScroll = ({ nativeEvent: e }: any) => {
    // 一番下まであと何ピクセルか
    const distanceFromBottom =
      e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height;
    // 一番下に近づいたら、棋譜を追加で読み込む
    if (distanceFromBottom < SNAP_INTERVAL * 1.5) {
      loadMore();
    }
  };

  // ---- FlatListの一つのアイテムを生成 ----
  const renderItem = ({ item }: { item: RecordType }) => {
    const isPlayerBlack = item.black_uid === uid;
    const blackWins = item.result?.startsWith("B");
    const playerWin = isPlayerBlack ? blackWins : !blackWins;
    const processed = processedRecords[item.id];
    return (
      <RecordCard
        boardSize={boardSizeRef.current}
        record={item}
        boardHistory={processed?.boardHistory ?? []}
        moves={processed?.moves ?? []}
        agehamaHistory={processed?.agehamaHistory ?? []}
        territoryBoard={processed?.territoryBoard}
        matchType={processed?.matchType ?? 0}
        cardHeight={CARD_HEIGHT}
        playerWin={isSkeletonCard(item) ? undefined : playerWin}
        isPlayerBlack={isPlayerBlack}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ヘッダ部分 */}
      <View style={styles.header}>
        {/* 戻るボタン */}
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
        </TouchableOpacity>
        <NineThirteenButton boardSize={boardSize} onToggle={handleToggle} />
      </View>
      <View
        style={{
          flex: 1 /* これが意外とめっちゃ大事で、消すとスクロールできなくなる(web)。なんでやねん。 */,
        }}
      >
        {/* 本体: スクロールできるリスト。FlatListは動的に要素を取得するのに向いているみたい。なので今回の使い方はピッタリ */}
        <FlatList
          pagingEnabled // ページ単位でスクロールさせる（スワイプすると次のカードまでスクロール）
          data={records} // 表示するデータの配列
          renderItem={renderItem} // 各アイテムをどう描画するかの関数
          keyExtractor={(item) => String(item.id)} // 各アイテムのキーを指定（React が再描画を効率的にするため）
          snapToInterval={SNAP_INTERVAL} // スクロール時に「スナップ」させる距離の指定（カードサイズごとに止まる）
          // スナップ位置をどこに合わせるか（start は上端/左端）
          snapToAlignment="start"
          // スクロール後の慣性（速く止まるようにする）
          decelerationRate="fast"
          // アイテムの位置を計算してくれる関数。レンダリング効率アップ用
          getItemLayout={(_, i) => ({
            length: CARD_HEIGHT, // 1アイテムの高さ
            offset: SNAP_INTERVAL * i, // i番目のアイテムのオフセット位置
            index: i, // アイテムのインデックス
          })}
          // リスト全体のスタイル。データがないときは中央に表示
          contentContainerStyle={
            records.length === 0
              ? { flex: 1, alignItems: "center", justifyContent: "center" }
              : styles.listContent
          }
          // 縦スクロールバーを非表示に
          showsVerticalScrollIndicator={false}
          // スクロール時に呼ばれる関数とイベントの間隔（ミリ秒）
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // リスト末尾に到達したときに追加データを読み込む関数
          onEndReached={loadMore}
          // リスト末尾に到達する判定の閾値（30%手前で呼ばれる）
          onEndReachedThreshold={0.3}
          // データが空のときに表示するコンポーネント
          ListEmptyComponent={
            <View style={{ alignItems: "center", gap: 16 }}>
              <Text style={styles.emptyText}>{t("MyRecords.empty")}</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, // ここのflex:1も消すとスクロールできなくなる。なんでやねんw
  header: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 18,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSub,
    letterSpacing: 0.8,
    fontWeight: "600",
  },
});
