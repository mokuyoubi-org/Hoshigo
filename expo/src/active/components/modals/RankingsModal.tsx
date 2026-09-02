// RankingsModal.tsx
import {
  Profile,
  RankingCard,
} from "@/src/active/components/cards/RankingCard";
import { COLORS } from "@/src/active/constants/colors";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { BOARD_SIZE_OPTIONS, BoardSize } from "expo-goband";
import { ModalShell } from "modal-shell";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  useWindowDimensions,
} from "react-native";
import { SegmentedControl } from "ui-atoms";

// 🐱 取得するデータに board_size も含める
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

  // 🐱 モーダルが開いた時だけ1回通信して全データを取る
  useEffect(() => {
    if (!visible) return;

    const fetchTopProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_rankings");

      if (error) {
        console.error(error);
      } else {
        setAllProfiles(data ?? []);
      }
      setLoading(false);
    };

    fetchTopProfiles();
  }, [visible]); // ← 引数の boardSize を外して、初回表示時だけに統一した

  if (!visible) return null;

  // 🐱 選択されている boardSize のデータだけサクッと絞り込む
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
