import { useTranslation } from "@/src/active/i18n";
import { getSortedCountries } from "@/src/stable/logics/country";
import React, { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { CountryListItem } from "../../components/country/CountryListItem";
import { COLORS } from "../../constants/colors";
import { useProfile } from "../../contexts/ProfileContexts";

type Props = {
  // 非同期処理にも対応できるように async / Promise を受けても大丈夫にしておく
  onSelectCountry: (countryCode: string) => void | Promise<void>;
  onClose: () => void;
};

const ITEM_HEIGHT = 49; // ⚠️2026/09/24これが超大事!!!!!!!!!!!!!!!50でも51でもいけない。

export function CountryModal({ onSelectCountry, onClose }: Props) {
  const { country } = useProfile();
  const t = useTranslation();
  const countries = getSortedCountries();
  const flatListRef = useRef<FlatList>(null);

  // 選択中の国コード（またはローディング状態）を保持する
  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  const selectedIndex = countries.findIndex((item) => item.code === country);

  const handleSelect = async (countryCode: string) => {
    // 既に何か処理中なら連打防止
    if (loadingCode) return;

    setLoadingCode(countryCode);
    try {
      await onSelectCountry(countryCode);
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      style={{ alignItems: "center", gap: 16 }}
    >
      <Text className="text-xl font-bold color-text text-center pb-4">
        {t("common.country")}
      </Text>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden max-h-[350px]">
        <FlatList
          ref={flatListRef}
          data={countries}
          keyExtractor={(item) => item.code}
          initialScrollIndex={selectedIndex >= 0 ? selectedIndex : 0}
          // 区切り線(1px)を足した正確な高さを指定するにゃ！
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          // もし描画前に位置移動が失敗してもクラッシュを防ぐ保険にゃ！
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 50));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            });
          }}
          ItemSeparatorComponent={() => (
            <View className="h-[1px] bg-backgroundDark w-full" />
          )}
          renderItem={({ item }) => {
            const isLoading = loadingCode === item.code;

            return (
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <CountryListItem
                    item={item}
                    isSelected={country === item.code}
                    onPress={handleSelect}
                  />
                </View>
                {/* 選択中の項目にくるくるを表示する */}
                {isLoading && (
                  <View className="pr-4">
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>
    </ModalShell>
  );
}
