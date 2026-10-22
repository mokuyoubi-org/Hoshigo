// RecordsScreen.tsx

import { RecordCard } from "@/src/components/cards/RecordCard";
import { SkeletonCard } from "@/src/components/cards/SkeletonCard";
import { MyText } from "@/src/components/common/MyText";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useRecordsScreen } from "@/src/hooks/records/useRecordsScreen";
import { useTranslation } from "@/src/i18n/LangProvider";
import { isSkeletonCard } from "@/src/logics/record/recordCardLogics";
import { RecordOrSkeleton } from "@/src/types/record";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BLACK, WHITE } from "go-core";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyHeader, SegmentedControl } from "ui-atoms";
import { useBlurActiveElement } from "../hooks/common/useBlurActiveElement";
import { boardSizeOptions } from "../logics/format/boardSizeToText";
import { resultToSubjectiveComment } from "../logics/format/textFormatter";

export default function RecordsScreen() {
  const fontFamily = useAppFont();
  // state
  const t = useTranslation();
  const colors = useColors();
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
        ownership={processed.ownership}
        matchType={processed.matchType}
        cardHeight={CARD_HEIGHT}
        playerWin={playerWin}
        isPlayerBlack={isPlayerBlack}
        onPress={() => {
          router.push({
            // 2026/10/05: ⚠️ここはpushでいい
            pathname: "/BoardEditScreen",
            params: {
              recordParam: JSON.stringify(item),
              from: "RecordScreen",
              resultComment:
                resultToSubjectiveComment(
                  item.result ?? "",
                  isPlayerBlack ? BLACK : WHITE,
                  t,
                ) ?? t("common.unknown"),
            },
          });
        }}
      />
    );
  };

  useBlurActiveElement();

  // 一つ一つのレコードカードに与えられた固有のid。
  // ※上から順番の0,1,2,...みたいなindexではないらしい。というのは、要素の並び替えなどにも柔軟に対応するため。
  // そして、そのidをkeyとして使うためにstringにしている。
  const keyExtractor = (item: RecordOrSkeleton) => String(item.id);

  const contentContainerStyle =
    records.length === 0
      ? {
          flex: 1,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        }
      : {
          gap: 16,
        };

  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <StatusBar style="dark" />
      {/* コンテナ */}
      <View className="flex-1 w-full max-w-160 px-4 p-2">
        {/* ヘッダ部分 */}
        <MyHeader
          left={
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace({ pathname: "/HomeScreen" });
                }
              }}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={36} color={colors.textSub} />
            </TouchableOpacity>
          }
          right={
            <SegmentedControl
              trackBackgroundColor={colors.backgroundStrong}
              activeSegmentBackgroundColor={colors.foreground}
              activeTextColor={colors.text}
              inactiveTextColor={colors.textSub}
              value={boardSize}
              options={boardSizeOptions(t)}
              onSelect={handleToggle}
              fontFamily={fontFamily}
            />
          }
        />

        {/* リスト領域 */}
        <View className="flex-1 pt-2">
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
                <MyText className="text-base text-textSub tracking-wider">
                  {t("MyRecords.empty")}
                </MyText>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
