// RankingsModal.tsx
import { BOARD_SIZE_OPTIONS, BoardSize } from "@/packages/go-core/src";
import {
  Profile,
  RankingCard,
} from "@/src/active/components/cards/RankingCard";
import { COLORS } from "@/src/active/constants/colors";
import { fetchWithDailyCache } from "@/src/stable/logics/syncUtils"; // 🐱 追加！
import { supabase } from "@/src/stable/services/supabase/supabase";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  useWindowDimensions,
} from "react-native";
import { ModalShell, SegmentedControl } from "ui-atoms";

type RankingItem = Profile & {
  board_size: number;
  is_authenticated: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function RankingsModal({ visible, onClose }: Props) {
  const [allProfiles, setAllProfiles] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardSize, setBoardSize] = useState<BoardSize>(9);

  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    if (!visible) return;

    const fetchTopProfiles = async () => {
      setLoading(true);

      // 🐱 1日1回だけ Supabase から取得し、2回目以降は sqliteKv のキャッシュを使う
      const data = await fetchWithDailyCache<RankingItem[]>(
        "global_rankings",
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
    <ModalShell onClose={onClose} size="lg">
      <View className="w-full pb-3 border-b border-backgroundDark/30 mb-3 items-start">
        <SegmentedControl
          value={boardSize}
          options={BOARD_SIZE_OPTIONS}
          onSelect={setBoardSize}
        />
      </View>

      {loading ? (
        <View
          className="w-full justify-center items-center"
          style={{ height: windowHeight * 0.25 }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
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
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ height: windowHeight * 0.65 }}
        />
      )}
    </ModalShell>
  );
}
