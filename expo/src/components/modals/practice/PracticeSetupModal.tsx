// PracticeSetupModal.tsx 最終形
// overlaycontextの枠は使っていない。

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { usePracticeSetup } from "@/src/hooks/practice/usePracticeSetup";
import { useTranslation } from "@/src/i18n/LangProvider";
import { nameFormatter } from "@/src/logics/bot/botNameLogics";
import { getRankInfo } from "@/src/logics/rank/rankLogics";
import { PlayerType } from "@/src/types/player";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { BLACK, BoardSize, Color, MatchType, WHITE } from "go-core";
import { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { Avatar } from "../../avatar/Avatar";

type Props = {
  from?: string;
  boardSize: BoardSize;
  setBoardSize: (v: BoardSize) => void;
  blackPlayer: PlayerType;
  setBlackPlayer: (v: PlayerType) => void;
  whitePlayer: PlayerType;
  setWhitePlayer: (v: PlayerType) => void;
  matchType: MatchType;
  setMatchType: (v: MatchType) => void;
  onStart: () => void;
  onResume: () => void;
  myRating: number;
  myIconIndex: number;
  myUid: string;
};

export const PracticeSetupModal = ({
  from,
  boardSize,
  setBoardSize,
  blackPlayer,
  setBlackPlayer,
  whitePlayer,
  setWhitePlayer,
  matchType,
  setMatchType,
  onStart,
  onResume,
  myRating,
  myIconIndex,
  myUid,
}: Props) => {
  const t = useTranslation();
  const colors = useColors();

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
  });

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

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
      }
    };

    // 次のプレイヤーを選択（未DLならモーダルを開く）
    const handleNext = () => {
      if (!isAtMax) {
        const nextOpt = playerOptions[currentIndex + 1];
        setPlayer(nextOpt.player);
      }
    };

    // 表示には、stateに残っている古いコピーではなく、最新の playerOptions 側の情報を使う
    const displayPlayer =
      currentIndex >= 0 ? playerOptions[currentIndex].player : assignedPlayer;
    const rankIndex = getRankInfo(displayPlayer.rating, t).index;

    return (
      <View className="bg-foreground relative flex-row h-20 rounded-xl border border-backgroundStrong bg-background overflow-hidden">
        {/* 左半分エリア：タップすると「前へ」 */}
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-start pl-3"
          onPress={handlePrev}
          disabled={isAtMin}
          activeOpacity={0.7}
        >
          <Feather
            name="chevron-left"
            size={16}
            color={colors.textSub}
            style={{ opacity: isAtMin ? 0 : 1 }} // ⚠️Android対策として、色ではなくopacityで見えないようにする
          />
        </TouchableOpacity>

        {/* 中央：プレイヤー情報（見た目だけの飾り。タップは下のボタンに透過する） */}
        <View
          className={
            "absolute inset-0 justify-center items-center pointer-events-none px-8"
          }
        >
          <Avatar
            rankIndex={rankIndex}
            iconIndex={displayPlayer.iconIndex}
            size={36}
            playerColor={color}
          />
          <MyText
            // botもしくはそれぞれの言語での"you"なのでMixedTextである必要はない
            className="text-text text-base"
            numberOfLines={1}
          >
            {nameFormatter(assignedPlayer.username, t)}
          </MyText>
        </View>

        {/* 右半分エリア：タップすると「次へ」 */}
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-end pr-3"
          onPress={handleNext}
          disabled={isAtMax}
          activeOpacity={0.7}
        >
          <Feather
            name="chevron-right"
            size={16}
            color={colors.textSub}
            style={{ opacity: isAtMax ? 0 : 1 }} // ⚠️Android対策として、色ではなくopacityで見えないようにする
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
              router.replace({ pathname: "/HomeScreen" });
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={colors.textSub} />
        </TouchableOpacity>
      </View>

      {/* 盤サイズ */}
      <MyText className="text-sm text-textSub mb-2">
        {t("Practice.boardSize")}
      </MyText>

      <View className="flex-row gap-2 mb-4">
        {([5, 9, 13, 19] as BoardSize[]).map((size) => (
          <TouchableOpacity
            key={size}
            className={`bg-foreground flex-1 h-12 rounded-xl border-2 justify-center items-center ${
              boardSize === size ? "border-primary" : "border-backgroundStrong"
            }`}
            onPress={() => selectBoardSize(size)}
            activeOpacity={1}
          >
            <MyText className="text-text">{size}</MyText>
          </TouchableOpacity>
        ))}
      </View>

      {/* ハンデ (handicap) */}
      <MyText className="text-sm text-textSub mb-2">
        {t("MatchType.handicap")}
      </MyText>

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
            color={colors.textSub}
            style={{ opacity: isHandicapAtMin ? 0 : 1 }} // ⚠️Android対策として、色ではなくopacityで見えないようにする
          />
        </TouchableOpacity>

        <View className="absolute inset-0 justify-center items-center pointer-events-none px-8">
          <MyText className="text-text text-base" numberOfLines={1}>
            {t(`MatchType.matchType_${handicapOptions[handicapIndex]}`)}
          </MyText>
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
            color={colors.textSub}
            style={{ opacity: isHandicapAtMax ? 0 : 1 }} // ⚠️Android対策として、色ではなくopacityで見えないようにする
          />
        </TouchableOpacity>
      </View>

      {/* プレイヤー設定セクション */}
      <MyText className="text-sm text-textSub mb-2">
        {t("common.player")}
      </MyText>

      <View className="flex-row gap-2 mb-6 w-full">
        {/* 黒プレイヤー選択 */}
        <View className="flex-1">{renderPlayerSelector(BLACK)}</View>

        {/* 白プレイヤー選択 */}
        <View className="flex-1">{renderPlayerSelector(WHITE)}</View>
      </View>

      {/* 対局開始ボタン */}
      <TouchableOpacity
        className={"h-12 rounded-2xl justify-center items-center bg-blackStone"}
        onPress={onStart}
        activeOpacity={0.7}
      >
        <MyText className="text-base text-foreground">
          {t("common.newGame")}
        </MyText>
      </TouchableOpacity>

      {/* 再開するボタン */}
      {from !== "HomeScreen" && (
        <TouchableOpacity
          className={
            "mt-2 h-12 rounded-2xl justify-center items-center bg-blackStone"
          }
          onPress={onResume}
          activeOpacity={0.7}
        >
          <MyText className="text-base text-foreground">
            {t("common.resumeGame")}
          </MyText>
        </TouchableOpacity>
      )}
    </ModalShell>
  );
};
