// RankingsModal.tsx
import {
  Profile,
  RankingCard,
} from "@/src/active/components/cards/RankingCard";

import { boardSizeOptions } from "@/src/stable/logics/boardSizeToText";
import { fetchWithPeriodicCache } from "@/src/stable/logics/syncUtils"; // 🐱 追加！
import { supabase } from "@/src/stable/services/supabase/supabase";
import { BoardSize } from "go-core";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  useWindowDimensions,
} from "react-native";
import { useKVStorage } from "storage-kit";
import { ModalShell, SegmentedControl } from "ui-atoms";
import { useAppFont } from "../hooks/useAppFont";
import { useColors } from "../hooks/useTheme";
import { useTranslation } from "../i18n/LangProvider";


type RankingItem = Profile & {
  board_size: number;
  is_authenticated: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function RankingsModal({ visible, onClose }: Props) {
  const fontFamily = useAppFont();
  const t = useTranslation();
  const colors = useColors();
  const [allProfiles, setAllProfiles] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { value: boardSize, setValue: setBoardSize } = useKVStorage<BoardSize>(
    "RankingsModal.boardSize", // ユニークなキーを用意する
    9,
  );

  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    // 🛡️ガード
    if (!visible) return;

    const fetchTopProfiles = async () => {
      setLoading(true);

      // 🐱 1日1回だけ Supabase から取得し、2回目以降はキャッシュを使う
      const data = await fetchWithPeriodicCache<RankingItem[]>(
        "global_rankings",
        1440,
        async () => {
          const { data, error } = await supabase.rpc("get_rankings");
          if (error) throw error;
          return data ?? [];
        },
      );

      setAllProfiles(data ?? []);
      setLoading(false);
    };

    fetchTopProfiles();
  }, [visible]);

  if (!visible) return null;

  const currentProfiles = allProfiles.filter(
    (item) => item.board_size === boardSize,
  );

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      contentPadding={16}
    >
      <View className="w-full pb-4 items-start">
        <SegmentedControl
          trackBackgroundColor={colors.backgroundStrong}
          activeSegmentBackgroundColor={colors.foreground}
          activeTextColor={colors.text}
          inactiveTextColor={colors.textSub}
          value={boardSize}
          options={boardSizeOptions(t)}
          onSelect={setBoardSize}
          fontFamily={fontFamily}
        />
      </View>

      {loading ? (
        <View
          className="w-full justify-center items-center"
          style={{ height: windowHeight * 0.25 }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentProfiles}
          keyExtractor={(item) => `${item.board_size}-${item.username}`}
          renderItem={({ item, index }) => (
            <RankingCard item={item} index={index} />
          )}
          contentContainerStyle={{
            paddingBottom: 16,
          }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ height: windowHeight * 0.65 }}
        />
      )}
    </ModalShell>
  );
}
