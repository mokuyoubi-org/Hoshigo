// PracticeSetupModal.tsx 最終形
// overlaycontextの枠は使っていない。

import { useTranslation } from "@/src/active/i18n/LangProvider";
import { botNameFormatter } from "@/src/stable/logics/bot/botNameLogics";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { BLACK, BoardSize, Color, MatchType, WHITE } from "go-core";
import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";

import { useOverlay } from "../../contexts/OverlayContext";
import { PlayerType } from "../../hooks/practice/usePracticeSession";
import { usePracticeSetup } from "../../hooks/practice/usePracticeSetup";
import { useColors } from "../../hooks/useTheme";
import { Avatar } from "../avatar/Avatar";
import { AppText } from "../common/AppText";
import { AIDownloadModal } from "./AIDownloadModal";

type Props = {
  boardSize: BoardSize;
  setBoardSize: (v: BoardSize) => void;
  blackPlayer: PlayerType;
  setBlackPlayer: (v: PlayerType) => void;
  whitePlayer: PlayerType;
  setWhitePlayer: (v: PlayerType) => void;
  matchType: MatchType;
  setMatchType: (v: MatchType) => void;
  onStart: () => void;
  isLoaded: boolean;
  myRating: number;
  myIconIndex: number;
  myUid: string;
};

export function PracticeSetupModal({
  boardSize,
  setBoardSize,
  blackPlayer,
  setBlackPlayer,
  whitePlayer,
  setWhitePlayer,
  matchType,
  setMatchType,
  onStart,
  isLoaded,
  myRating,
  myIconIndex,
  myUid,
}: Props) {
  const t = useTranslation();
  const colors = useColors();
  const { show } = useOverlay();

  const {
    handicapOptions,
    handicapIndex,
    isHandicapAtMin,
    isHandicapAtMax,
    selectBoardSize,
    selectPreviousHandicap,
    selectNextHandicap,
    playerOptions,
  } = usePracticeSetup({
    boardSize,
    setBoardSize,
    matchType,
    setMatchType,
    blackPlayer,
    setBlackPlayer,
    whitePlayer,
    setWhitePlayer,
    myRating,
    myIconIndex,
    myUid,
    onRequestDownload: () => show(<AIDownloadModal from="practice" />),
  });

  // 黒と白それぞれの選択中オプションを取得
  const blackOpt = playerOptions.find(
    (opt) => opt.player.username === blackPlayer.username,
  );
  const whiteOpt = playerOptions.find(
    (opt) => opt.player.username === whitePlayer.username,
  );

  // どちらか一方でも準備（ready）ができていなければ開始不可にする
  const isStartDisabled =
    blackOpt?.statusPhase !== "ready" || whiteOpt?.statusPhase !== "ready";

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

  // プレイヤーの表示名を整形するヘルパー
  const getPlayerDisplayName = (player: PlayerType) => {
    if (player.username === "you") return t("common.you");
    return botNameFormatter(player.username, t);
  };

  // 指定された色（BLACK または WHITE）の行（左右選択コンポーネント）を描画する関数
  const renderPlayerSelector = (color: Color) => {
    const isBlack = color === BLACK;
    const assignedPlayer = isBlack ? blackPlayer : whitePlayer;
    const setPlayer = isBlack ? setBlackPlayer : setWhitePlayer;

    const currentIndex = playerOptions.findIndex(
      (opt) => opt.player.username === assignedPlayer.username,
    );

    const isAtMin = currentIndex <= 0;
    const isAtMax = currentIndex >= playerOptions.length - 1;

    // 前のプレイヤーを選択（未DLならモーダルを開く）
    const handlePrev = () => {
      if (!isAtMin) {
        const prevOpt = playerOptions[currentIndex - 1];
        setPlayer(prevOpt.player);
        if (prevOpt.statusPhase !== "ready") {
          prevOpt.onPress();
        }
      }
    };

    // 次のプレイヤーを選択（未DLならモーダルを開く）
    const handleNext = () => {
      if (!isAtMax) {
        const nextOpt = playerOptions[currentIndex + 1];
        setPlayer(nextOpt.player);
        if (nextOpt.statusPhase !== "ready") {
          nextOpt.onPress();
        }
      }
    };

    const currentOpt = playerOptions[currentIndex] || playerOptions[0];
    const isOptionDisabled = currentOpt?.statusPhase !== "ready";

    const rankIndex = getRankInfo(assignedPlayer.rating, t).index;

    return (
      <View className="bg-foreground flex-row h-20 rounded-xl border border-backgroundStrong bg-background overflow-hidden items-center">
        {/* 左矢印（固定幅で確保） */}
        <TouchableOpacity
          className="w-10 h-full justify-center items-center"
          onPress={handlePrev}
          disabled={isAtMin}
          activeOpacity={0.7}
        >
          <Feather
            name="chevron-left"
            size={16}
            color={isAtMin ? "transparent" : colors.textSub}
          />
        </TouchableOpacity>

        {/* 中央：プレイヤー情報（左右と重ならないように flex-1 に変更した） */}
        <TouchableOpacity
          className={`flex-1 h-full flex-col justify-center items-center ${
            isOptionDisabled ? "opacity-40" : "" // 2026/09/28: やむを得ない。一旦このまま
          }`}
          onPress={() => {
            if (isOptionDisabled && currentOpt) {
              currentOpt.onPress();
            }
          }}
          activeOpacity={isOptionDisabled ? 0.7 : 1}
        >
          <Avatar
            rankIndex={rankIndex}
            iconIndex={assignedPlayer.iconIndex}
            size={36}
            playerColor={color}
          />
          <AppText className="text-text text-base" numberOfLines={1}>
            {getPlayerDisplayName(assignedPlayer)}
          </AppText>
        </TouchableOpacity>

        {/* 右矢印（固定幅で確保） */}
        <TouchableOpacity
          className="w-10 h-full justify-center items-center"
          onPress={handleNext}
          disabled={isAtMax}
          activeOpacity={0.7}
        >
          <Feather
            name="chevron-right"
            size={16}
            color={isAtMax ? "transparent" : colors.textSub}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ModalShell
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      {/* 戻るボタン */}
      <View className="flex-row items-center mb-4">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/HomeScreen");
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={colors.textSub} />
        </TouchableOpacity>
      </View>

      {/* 盤サイズ */}
      <AppText className="text-sm text-textSub mb-2">
        {t("Practice.boardSize")}
      </AppText>
      {isLoaded && (
        <View className="flex-row gap-2 mb-4">
          {([5, 9, 13, 19] as BoardSize[]).map((size) => (
            <TouchableOpacity
              key={size}
              className={`bg-foreground flex-1 h-12 rounded-xl border-2 justify-center items-center ${
                boardSize === size
                  ? "border-primary"
                  : "border-backgroundStrong"
              }`}
              onPress={() => selectBoardSize(size)}
            >
              <AppText className="text-text">{size}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ハンデ (handicap) */}
      <AppText className="text-sm text-textSub mb-2">
        {t("MatchType.handicap")}
      </AppText>
      {isLoaded && (
        <View className="bg-foreground flex-row h-14 rounded-xl border border-backgroundStrong bg-background overflow-hidden mb-4">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-start pl-2"
            onPress={selectPreviousHandicap}
            disabled={isHandicapAtMin}
            activeOpacity={0.7}
          >
            <Feather
              name="chevron-left"
              size={16}
              color={isHandicapAtMin ? "transparent" : colors.textSub}
            />
          </TouchableOpacity>

          <View className="absolute inset-0 justify-center items-center pointer-events-none px-8">
            <AppText className="text-text text-base" numberOfLines={1}>
              {t(`MatchType.matchType_${handicapOptions[handicapIndex]}`)}
            </AppText>
          </View>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-end pr-2"
            onPress={selectNextHandicap}
            disabled={isHandicapAtMax}
            activeOpacity={0.7}
          >
            <Feather
              name="chevron-right"
              size={16}
              color={isHandicapAtMax ? "transparent" : colors.textSub}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* プレイヤー設定セクション */}
      <AppText className="text-sm text-textSub mb-2">
        {t("common.player")}
      </AppText>

      {isLoaded && (
        <View className="flex-row gap-2 mb-6 w-full">
          {/* 黒プレイヤー選択 */}
          <View className="flex-1">{renderPlayerSelector(BLACK)}</View>

          {/* 白プレイヤー選択 */}
          <View className="flex-1">{renderPlayerSelector(WHITE)}</View>
        </View>
      )}

      {/* 対局開始ボタン */}
      <TouchableOpacity
        className={`h-12 rounded-2xl justify-center items-center ${
          isStartDisabled ? "bg-backgroundStrong" : "bg-blackStone"
        }`}
        onPress={onStart}
        disabled={isStartDisabled}
        activeOpacity={0.7}
      >
        <AppText className="text-base text-foreground">
          {t("common.gameStart")}
        </AppText>
      </TouchableOpacity>
    </ModalShell>
  );
}
