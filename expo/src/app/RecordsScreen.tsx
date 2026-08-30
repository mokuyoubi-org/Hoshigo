// Records.tsx
import { RecordCard } from "@/src/active/components/cards/RecordCard";
import { useTranslation } from "@/src/active/language/i18n";
import { RecordOrSkeleton } from "@/src/active/types/record";
import { BOARD_SIZE_OPTIONS } from "expo-goband";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SegmentedControl } from "ui-atoms";
import { useRecordsScreen } from "../active/hooks/others/useRecordsScreen";
import { isSkeletonCard } from "../stable/logics/recordCardLogics";

// ページ本体
export default function Records() {
  const t = useTranslation();
  const {
    uid,
    records,
    processedRecords,
    boardSize,
    boardSizeRef,
    CARD_HEIGHT,
    SNAP_INTERVAL,
    handleToggle,
    loadMore,
    handleScroll,
  } = useRecordsScreen();

  // ---- FlatListの一つのアイテムを生成 ----
  const renderItem = ({ item }: { item: RecordOrSkeleton }) => {
    const processed = processedRecords[item.id];

    if (isSkeletonCard(item)) {
      return (
        <RecordCard
          boardSize={boardSizeRef.current}
          record={item}
          boardHistory={[]}
          moves={[]}
          agehamaHistory={[]}
          territoryBoard={undefined}
          matchType={0}
          cardHeight={CARD_HEIGHT}
          playerWin={undefined}
          isPlayerBlack={undefined}
        />
      );
    }

    // ここから先、item は TypeScript 上も確実に RecordType
    const isPlayerBlack = item.black_uid === uid;
    const blackWins = item.result?.startsWith("B")
      ? true
      : item.result?.startsWith("W")
        ? false
        : undefined;
    const playerWin = isPlayerBlack ? blackWins : !blackWins;

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
        playerWin={playerWin}
        isPlayerBlack={isPlayerBlack}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* コンテナ（中央寄せ＆最大幅680px） */}
      <View className="flex-1 w-full max-w-[680px] mx-auto">
        {/* ヘッダ部分 */}
        <View className="flex-row justify-between items-center px-5 py-3">
          {/* 戻るボタン */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/ProfileScreen")}
            activeOpacity={0.7}
          >
            <Text className="text-base font-bold text-text tracking-wide">
              ‹ {t("common.back")}
            </Text>
          </TouchableOpacity>
          <SegmentedControl
            value={boardSize}
            options={BOARD_SIZE_OPTIONS}
            onSelect={handleToggle}
          />
        </View>

        {/* リスト領域（Web対応のflex-1をしっかり保持） */}
        <View className="flex-1">
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
                : {
                    paddingHorizontal: 16,
                    paddingTop: 18,
                    paddingBottom: 32,
                    gap: 18,
                  }
            }
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
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
