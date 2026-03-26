// PlayerRecords.tsx
// お約束
import { GhostCard } from "@/src/components/Cards/GhostCard";
import { RecordCard } from "@/src/components/Cards/RecordCard";
import {
  isSkeletonCard,
  makeSkeletonCard,
} from "@/src/components/Cards/SkeletonCard";
import { BACKGROUND, CHOCOLATE, STRAWBERRY } from "@/src/constants/colors";
import { Agehama, RecordType } from "@/src/constants/goConstants";
import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";
import { PlanIdContext, UidContext } from "@/src/contexts/UserContexts";
import { Board } from "@/src/lib/goLogics";
import {
  intArrayToStringArray,
  makeTerritoryBoard,
  movesToBoardHistory,
} from "@/src/lib/goUtils";
import { supabase } from "@/src/services/supabase";
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
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 定数
const FETCH_COUNT = 10; // 一回のフェッチで取ってくるデータの数
const START_PLAN_LIMIT = 10; // スタートプランの取って来られる棋譜の上限

// ページ本体
export default function MyRecords() {
  // グローバルstate
  const uid = useContext(UidContext);
  const { planId } = useContext(PlanIdContext)!;
  const { lang } = useContext(LangContext)!;

  // 定数
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const CARD_HEIGHT = height * 0.64;
  const SNAP_INTERVAL = CARD_HEIGHT + 18;
  const isStartPlan = planId === 0; // planId=0はスタートプラン

  // state
  // 一番最初の時点で、skeletoncardが10対配置されているのだ。
  const [records, setRecords] = useState<RecordType[]>(
    makeSkeletonCard(FETCH_COUNT),
  );
  const [showGhost, setShowGhost] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
  const isFetchingMore = useRef(false); // 今データを取りに行ってる最中かどうか。

  // 一番最初にやること: fetchRecords
  useEffect(() => {
    if (uid && planId !== null) {
      fetchRecords(0); // 最初はoffsetは0、つまり0~9の10件を取ってくる
    }
  }, [uid, planId]);

  // fetchRecords本体
  const fetchRecords = async (offset: number) => {
    //uidがなければ何もしない
    if (!uid) return;

    // ここから処理本体
    try {
      // 要は、まず10件取ってくる。みんな共通で、このページを開いた瞬間。
      const { data, error } = await supabase
        .schema("game")
        .rpc("get_records_with_profiles", {
          p_uid: uid, // 一応(将来の拡張のために)他人のも取ってこれるようにuidを要求しているが、不要かも。
          p_limit: FETCH_COUNT, // 何個データを取ってくるか。10個。
          p_offset: offset, // offsetはズレという意味。この場合は、どこからデータを取り始めるか。
        });

      // エラーならこれで処理おしまい
      if (error) {
        console.error(error);
        isFetchingMore.current = false;
        return;
      }

      const fetched = data ?? []; // 取得したデータ。
      const isFirst = offset === 0; // 今回が最初のフェッチかどうか。
      const reachedEnd = fetched.length < FETCH_COUNT; // 10個とりに行ったのにlengthが10未満ということはデータの最後に達した。

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

      if (isStartPlan) {
        // もしスタートプランなら
        setShowGhost(fetched.length >= START_PLAN_LIMIT); // クラウドに10局以上棋譜があればゴーストカードを表示する
        // まだ9局とかしか打っていない人にはゴーストカードは表示しない
        setHasMore(false); // 10件で終わり。もう取ってこれない
      } else {
        // もしプラスプランもしくはウルトラプランなら
        setShowGhost(false); // ゴーストカードを表示することは決してない。
        setHasMore(!reachedEnd); // 終わりに達していないなら、まだ取ってこれる
      }
      // エラー
    } catch (e) {
      console.error(e);
    } finally {
      // 必ずすること:
      // 処理の終わりに到達したので、「今取りに行ってる最中だよ！」をfalseに直しておく
      isFetchingMore.current = false;
    }
  };

  // ---- recordの情報から、操作可能な形に処理する。 ----
  const processRecords = useCallback((list: RecordType[]) => {
    list.forEach((record, i) => {
      setTimeout(() => {
        const moves = intArrayToStringArray(record.moves);
        const deadStones = intArrayToStringArray(record.dead_stones);
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
      }, i * 50);
    });
  }, []);

  // ---- 棋譜を追加で読み込む ----
  const loadMore = useCallback(() => {
    // 安全ガード。スタートプランであるorもうそもそも棋譜がないor今他の棋譜データを取りに行ってる途中だよ の場合はガード
    if (isStartPlan || !hasMore || isFetchingMore.current) return; // 今追加でデータを取りに行ってる最中なら、この関数は呼べない
    isFetchingMore.current = true; // 今追加でデータを取りに行ってる最中だよ！と宣言
    const realCount = records.filter((r) => !isSkeletonCard(r)).length; // recordsはスケルトン含む、今取得してる全てのrecordcard。そこからスケルトンを取り除いたのがrealCount
    // ここで、待たせるので一旦スケルトンカードを追加
    setRecords((prev) => [
      ...prev.filter((r) => !isSkeletonCard(r)),
      ...makeSkeletonCard(FETCH_COUNT),
    ]);
    fetchRecords(realCount); // そんなrealCountの一つ次の要素から探しに行けという意味
  }, [isStartPlan, hasMore, records]);

  // ---- スクロールした時の処理 ----
  const handleScroll = useCallback(
    ({ nativeEvent: e }: any) => {
      // 一番下まであと何ピクセルか
      const distanceFromBottom =
        e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height;
      // 一番下に近づいたら、棋譜を追加で読み込む
      if (distanceFromBottom < SNAP_INTERVAL * 1.5) {
        loadMore();
      }
    },
    [loadMore, SNAP_INTERVAL],
  );

  // ---- FlatListの一つのアイテムを生成 ----
  const renderItem = useCallback(
    ({ item }: { item: RecordType }) => {
      const isPlayerBlack = item.black_uid === uid;
      const blackWins = item.result?.startsWith("B");
      const playerWin = isPlayerBlack ? blackWins : !blackWins;

      return (
        <RecordCard
          record={item}
          boardHistory={boardHistories[item.id] ?? []}
          moves={movess[item.id] ?? []}
          agehamaHistory={agehamaHistories[item.id] ?? []}
          territoryBoard={territoryBoards[item.id]}
          matchType={matchTypes[item.id] ?? 0}
          cardHeight={CARD_HEIGHT}
          playerWin={isSkeletonCard(item) ? undefined : playerWin}
          isPlayerBlack={isPlayerBlack}
        />
      );
    },
    [
      uid,
      boardHistories,
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
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1 /* これが意外とめっちゃ大事で、消すとスクロールできなくなる(web)。なんでやねん。 */,
        }}
      >
        {/* ヘッダ部分 */}
        <View style={styles.header}>
          {/* 戻るボタン */}
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>
        </View>

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
              <View style={styles.emptyIcon}>
                <View style={styles.emptyIconInner} />
              </View>
              <Text style={styles.emptyText}>{t("MyRecords.empty")}</Text>
            </View>
          }
          // リストの最後に追加で表示するコンポーネント（ここではGhostCard）
          ListFooterComponent={
            showGhost ? <GhostCard cardHeight={CARD_HEIGHT} t={t} /> : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND }, // ここのflex:1も消すとスクロールできなくなる。なんでやねんw
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
