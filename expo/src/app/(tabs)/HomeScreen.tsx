import { MainButton } from "@/src/active/components/buttons/MainButton";
import { Header } from "@/src/active/components/common/Header";
import { MainTitle } from "@/src/active/components/mainTitle/MainTitle";


import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useAppFont } from "@/src/active/hooks/useAppFont";
import { useColors } from "@/src/active/hooks/useTheme";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import RankingsModal from "@/src/active/modals/RankingsModal";
import { RuleModal } from "@/src/active/modals/RuleModal";
import { boardSizeOptions } from "@/src/stable/logics/boardSizeToText";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BoardSize } from "go-core";
import React, { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKVStorage } from "storage-kit";
import { IconButton, SegmentedControl } from "ui-atoms";

export default function HomeScreen() {
  const fontFamily = useAppFont();
  const { startMatching, isMatching } = useMatching();
  const {
    value: boardSize,
    setValue: setBoardSize,
    isLoaded: isBoardSizeLoaded,
  } = useKVStorage<BoardSize>(
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

  useEffect(() => {
    // ⚠️⚠️⚠️謎のエラーを防ぐための部分なので消さない。これがないとBlocked aria-hidden...とか言われる
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <View className="flex-1 w-full max-w-160 mx-auto px-5 pt-3">
        <Header
          left={
            <View style={{ pointerEvents: isMatching ? "none" : "auto" }}>
              {isBoardSizeLoaded && (
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
              )}
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
        </Header>

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
                router.push("/PracticeGameScreen");
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
