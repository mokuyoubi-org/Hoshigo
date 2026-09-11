import { BoardSize, BOARD_SIZE_OPTIONS } from "@/packages/go-core/src";
import { IconButton, SegmentedControl } from "@/packages/ui-atoms/src";
import { MatchButton } from "@/src/active/components/buttons/MatchButton";
import { Header } from "@/src/active/components/common/Header";
import { MainTitle } from "@/src/active/components/common/MainTitile";
import RankingsModal from "@/src/active/components/modals/RankingsModal";
import { RuleModal } from "@/src/active/components/modals/RuleModal";
import { COLORS } from "@/src/active/constants/colors";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useMatching } from "@/src/active/contexts/providers/MatchingContext";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { startMatching, isMatching } = useMatching();
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const { show, hide } = useOverlay();

  const onMainbutton = () => {
    startMatching(boardSize);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <View className="flex-1 w-full max-w-[680px] mx-auto px-5 pt-3">
        <Header
          left={
            <View
              className={isMatching ? "opacity-60" : "opacity-100"}
              style={{ pointerEvents: isMatching ? "none" : "auto" }}
            >
              <SegmentedControl
                value={boardSize}
                options={BOARD_SIZE_OPTIONS}
                onSelect={setBoardSize}
              />
            </View>
          }
        >
          {/* 👑 ボタン */}
          <IconButton
            icon={<AntDesign name="crown" />}
            color={COLORS.primary}
            onPress={() =>
              show(<RankingsModal visible={true} onClose={hide} />)
            }
          />
          {/* ❓ ボタン */}
          <IconButton
            icon={<FontAwesome6 name="question" />}
            color={COLORS.primary}
            onPress={() => show(<RuleModal visible={true} onClose={hide} />)}
          />
        </Header>

        {/* 🌟 メインコンテンツエリア（ロゴタイトル ＋ ボタン） */}
        <View className="flex-1 items-center py-4">
          {/* 上の空白 (比率: 2) */}
          <View className="flex-[2]" />

          {/* タイトルロゴ */}
          <MainTitle />

          {/* 真ん中の空白 (比率: 1) */}
          <View className="flex-1" />

          {/* メインボタン */}
          <MatchButton
            onPress={onMainbutton}
            boardSize={boardSize}
            disabled={isMatching}
          />

          {/* 下の空白 (比率: 2) */}
          <View className="flex-[3]" />
        </View>
      </View>
    </SafeAreaView>
  );
}
