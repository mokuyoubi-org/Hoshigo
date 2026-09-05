import { useTranslation } from "@/src/active/language/i18n";
import { RecordOrSkeleton } from "@/src/active/types/record";
import { BOARD_SIZE_OPTIONS } from "expo-goband";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SegmentedControl } from "ui-atoms";
import { RecordCard } from "../active/components/cards/records/RecordCard";
import { SkeletonCard } from "../active/components/cards/SkeletonCard";
import { useRecordsScreen } from "../active/hooks/records/useRecordsScreen";
import { isSkeletonCard } from "../stable/logics/recordCardLogics";

export default function RecordsScreen() {
  // state
  const t = useTranslation();
  const {
    uid,
    records,
    processedRecords,
    boardSize,
    boardSizeRef,
    CARD_HEIGHT,
    SNAP_INTERVAL,
    currentIndex,
    flatListRef,
    handleToggle,
    loadMore,
    handleScroll,
  } = useRecordsScreen();

  // 関数
  const renderItem = ({ item }: { item: RecordOrSkeleton }) => {
    if (isSkeletonCard(item)) {
      return <SkeletonCard height={CARD_HEIGHT} />;
    }

    const processed = processedRecords[item.id];
    if (!processed) {
      return <SkeletonCard height={CARD_HEIGHT} />;
    }

    const isPlayerBlack = item.black_uid === uid;
    const blackWins = item.result?.startsWith("B")
      ? true
      : item.result?.startsWith("W")
        ? false
        : undefined;
    const playerWin = isPlayerBlack ? blackWins : !blackWins;

    return (
      <RecordCard
        agehama={processed.agehama}
        boardSize={boardSizeRef.current}
        record={item}
        board={processed.finalBoard}
        territoryBoard={processed.territoryBoard}
        matchType={processed.matchType}
        cardHeight={CARD_HEIGHT}
        playerWin={playerWin}
        isPlayerBlack={isPlayerBlack}
        onPress={() => {
          router.push({
            pathname: "/BoardEditScreen",
            params: { recordJson: JSON.stringify(item) },
          });
        }}
      />
    );
  };

  // 一つ一つのレコードカードに与えられた固有のid。
  // ※上から順番の0,1,2,...みたいなindexではないらしい。というのは、要素の並び替えなどにも柔軟に対応するため。
  // そして、そのidをkeyとして使うためにstringにしている。
  const keyExtractor = (item: RecordOrSkeleton) => String(item.id);

  // 何これ？
  const contentContainerStyle =
    records.length === 0
      ? {
          flex: 1,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        }
      : {
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 32,
          gap: 18,
        };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* コンテナ */}
      <View className="flex-1 w-full max-w-[680px] mx-auto">
        {/* ヘッダ部分 */}
        <View className="flex-row justify-between items-center px-5 py-3">
          {/* 戻るボタン */}
          <TouchableOpacity
            // ✨(tabs)/_layoutをslotからstackに変えたら、backが使えるようになった。✨
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text className="text-base font-bold text-text tracking-wide">
              ‹ {t("common.back")}
            </Text>
          </TouchableOpacity>
          {/* 盤面サイズ選択 */}
          <SegmentedControl
            value={boardSize}
            options={BOARD_SIZE_OPTIONS}
            onSelect={handleToggle}
          />
        </View>

        {/* リスト領域 */}
        <View className="flex-1">
          {/* 何これ？プロパティ多すぎ */}

          <FlatList
            ref={flatListRef} // FlatListを直接操作するための参照（スクロール位置の制御など）
            pagingEnabled // カード単位のスワイプになる
            data={records} // 表示するデータの配列（対局記録またはスケルトン）
            renderItem={renderItem} // 各要素を描画するコンポーネント関数
            keyExtractor={keyExtractor} // 一意のキーを抽出する関数（Reactの再描画最適化用）
            snapToInterval={SNAP_INTERVAL} // スナップ（吸着）させる間隔の高さ
            snapToAlignment="start" // スナップの基準位置を上端に合わせる
            decelerationRate="fast" // スクロールの減速スピードを速くし、スナップ動作をスムーズにする
            getItemLayout={(_, i) => ({
              // 各アイテムのサイズを事前計算してスクロール性能を最適化
              length: CARD_HEIGHT,
              offset: SNAP_INTERVAL * i,
              index: i,
            })}
            // 🐱 useState の値を渡す
            initialScrollIndex={currentIndex} // 初期表示時にスクロールしておくインデックス
            onScrollToIndexFailed={(info) => {
              // initialScrollIndex へのスクロールが失敗した場合のリカバリー処理
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: false,
              });
            }}
            contentContainerStyle={contentContainerStyle} // データ件数に応じて動的に変わるスタイル（余白調整や中央寄せ）
            showsVerticalScrollIndicator={false} // 垂直スクロールバーを非表示にする
            onScroll={handleScroll} // スクロールイベントの検知
            onEndReached={loadMore} // リストの末尾付近に達した時に追加データを読み込む関数
            onEndReachedThreshold={0.3} // 末尾からどれくらい手前（画面底面から30%の位置）で実行するかの閾値
            ListEmptyComponent={
              // データが空（0件）のときに表示するコンポーネント
              <View className="items-center gap-4">
                <Text className="text-[15px] font-semibold text-textSub tracking-wider">
                  {t("MyRecords.empty")}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
