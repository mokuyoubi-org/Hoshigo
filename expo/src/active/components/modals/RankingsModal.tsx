import { NineThirteenButton } from "@/src/active/components/buttons/NineThirteenButton";
import {
  Profile,
  RankingCard,
} from "@/src/active/components/cards/RankingCard";
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { BoardSize } from "@/src/stable/types/goTypes";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function RankingsModal({ visible, onClose }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslation();
  const [boardSize, setBoardSize] = useState<BoardSize>(9); // あくまで初期値

  useEffect(() => {
    if (!visible) return; // モーダルが開いてるときだけ取得

    const fetchTopProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_top_profiles", {
        p_board_size: boardSize,
      });

      if (error) {
        console.error(error);
      } else {
        setProfiles(data ?? []);
      }
      setLoading(false);
    };

    fetchTopProfiles();
  }, [boardSize, visible]); // このboardSize, visibleは外さない

  // ── UI ──
  return (
    <Modal
      visible={visible}
      transparent={true} // 背景を透けさせる
      animationType="fade" // ふんわり表示させる
      onRequestClose={onClose}
    >
      <StatusBar style="light" />

      {/* 暗い背景部分（タップすると閉じる） */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* カード本体（ここをタップしても閉じないようにガードする） */}
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <NineThirteenButton
                  boardSize={boardSize}
                  onToggle={setBoardSize}
                />
              </View>

              {/* リスト */}
              <FlatList
                data={profiles}
                keyExtractor={(item) => item.uid}
                renderItem={({ item, index }) => (
                  <RankingCard item={item} index={index} />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <LoadingModal text={t("common.loading")} visible={loading} />
    </Modal>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  // 画面全体を覆う暗い背景
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // モーダルの中身（浮き出る小窓）
  modalContent: {
    width: "100%",
    maxHeight: "80%", // 画面からはみ出さない調整
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingVertical: 12,
    elevation: 5,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
