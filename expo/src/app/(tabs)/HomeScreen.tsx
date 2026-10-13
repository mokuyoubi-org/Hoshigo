// HomeScreen.tsx

import { MainButton } from "@/src/components/buttons/MainButton";
import { MainTitle } from "@/src/components/mainTitle/MainTitle";
import RankingsModal from "@/src/components/modals/home/RankingsModal";
import { RuleModal } from "@/src/components/modals/home/RuleModal";
import { useMatching } from "@/src/contexts/MatchingContext";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useBlurActiveElement } from "@/src/hooks/common/useBlurActiveElement";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { boardSizeOptions } from "@/src/logics/format/boardSizeToText";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, ScreenHeader, SegmentedControl } from "ui-atoms";

export default function HomeScreen() {
  const fontFamily = useAppFont();
  const { startMatching, isMatching } = useMatching();
  const { value: boardSize, setValue: setBoardSize } = useKVStorage<BoardSize>(
    "HomeScreen.boardSize", // ユニークなキーを用意する
    9,
  );

  const { show, hide } = useOverlay();
  const t = useTranslation();
  const colors = useColors();
  // 関数の名前を「マッチング開始」だとわかりやすい名前に変更した
  const handleStartMatching = () => {
    startMatching(boardSize);
  };

  useBlurActiveElement();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <View className="flex-1 w-full max-w-160 mx-auto px-4 pt-2">
        <ScreenHeader
          left={
            <View style={{ pointerEvents: isMatching ? "none" : "auto" }}>
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
          }
        >
          {/* 👑 ボタン */}
          <IconButton
            icon={<AntDesign name="crown" />}
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() =>
              show(<RankingsModal visible={true} onClose={hide} />)
            }
          />
          {/* ❓ ボタン */}
          <IconButton
            icon={<FontAwesome6 name="question" />}
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => show(<RuleModal visible={true} onClose={hide} />)}
          />
        </ScreenHeader>

        {/* 🌟 メインコンテンツエリア（ロゴタイトル ＋ ボタン） */}
        <View className="flex-1 items-center py-4">
          {/* 上の空白 (比率: 2) */}
          <View className="flex-[2]" />

          {/* タイトルロゴ */}
          <MainTitle />

          {/* 真ん中の空白 (比率: 1) */}
          <View className="flex-1" />

          {/* メインボタンエリア（gap-4 でボタン同士の間にすき間を作った） */}
          <View className="w-full items-center gap-4">
            <MainButton
              onPress={handleStartMatching}
              boardSize={boardSize}
              disabled={isMatching}
              text={t("common.onlineMatch")}
            />
            <MainButton
              onPress={() => {
                router.push({
                  pathname: "/PracticeGameScreen",
                  params: { from: "HomeScreen" },
                });
              }}
              text={t("common.practice")}
            />
          </View>

          {/* 下の空白 (比率: 3) */}
          <View className="flex-[3]" />
        </View>
      </View>
    </SafeAreaView>
  );
}
