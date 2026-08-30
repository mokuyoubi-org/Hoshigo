import { MainButton } from "@/src/active/components/buttons/MainButton";
import { Header } from "@/src/active/components/common/Header";
import RankingsModal from "@/src/active/components/modals/RankingsModal";
import { RuleModal } from "@/src/active/components/modals/RuleModal";
import { COLORS } from "@/src/active/constants/colors";
import { useMatching } from "@/src/active/contexts/providers/MatchingContext";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { BOARD_SIZE_OPTIONS, BoardSize } from "expo-goband";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOverlay } from "react-overlay";
import { IconButton, SegmentedControl } from "ui-atoms";

export default function Home() {
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
          {/* 👑 ボタン（show()経由） */}
          <IconButton
            icon={<AntDesign name="crown" />}
            color={COLORS.primary}
            onPress={() =>
              show(<RankingsModal visible={true} onClose={hide} />)
            }
          />
          {/* ❓ ボタン（show()経由） */}
          <IconButton
            icon={<FontAwesome6 name="question" />}
            color={COLORS.primary}
            onPress={() => show(<RuleModal visible={true} onClose={hide} />)}
          />
        </Header>

        <MainButton
          onPress={onMainbutton}
          boardSize={boardSize}
          disabled={isMatching}
        />
      </View>
    </SafeAreaView>
  );
}
