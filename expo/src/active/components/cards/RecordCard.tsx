// ✅active
// RecordCard.tsx
import { SkeletonCard } from "@/src/active/components/cards/SkeletonCard";
import { AgehamaDisplay } from "@/src/active/components/go/Agehama";
import { AvatarWithPass } from "@/src/active/components/go/AvatarWithPass";
import { COLORS } from "@/src/active/constants/colors";
import { useLang, useTranslation } from "@/src/active/language/i18n";
import { RecordOrSkeleton } from "@/src/active/types/record";
import { resultToComment } from "@/src/stable/logics/resultToComment";
import {
  Agehama,
  BLACK,
  Board,
  BoardSize,
  Color,
  GoBoard,
  Grid,
  isNoOkiishi,
  MatchType,
  PASS_GRID,
  ReplayControls,
  WHITE,
} from "expo-goband";
import React, { useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import { isSkeletonCard } from "../../../stable/logics/recordCardLogics";

export type Props = {
  record: RecordOrSkeleton;
  boardHistory: Board[];
  moves: Grid[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][] | undefined;
  matchType: MatchType;
  cardHeight: number;
  /** 自分が勝ったか負けたか。未定義の場合はニュートラル表示 */
  playerWin?: boolean;
  isPlayerBlack?: boolean;
  boardSize: BoardSize;
};

export const RecordCard = ({
  record,
  boardHistory,
  moves,
  agehamaHistory,
  territoryBoard,
  matchType,
  cardHeight,
  playerWin,
  isPlayerBlack,
  boardSize,
}: Props) => {
  const { lang } = useLang();
  const t = useTranslation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState<number>(0); // 自分のwidthを保持するstate
  if (isSkeletonCard(record) || !territoryBoard) {
    return <SkeletonCard height={cardHeight} />;
  }

  // カードのレイアウトが確定した時にwidthを取得する
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setCardWidth(width);
  };

  // 自分が黒番なら black 側、白番なら white 側の値を選ぶヘルパー
  const self = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? blackVal : whiteVal;
  const opp = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? whiteVal : blackVal;

  const moveHistory = moves?.slice(0, currentIndex + 1) ?? [];
  const isCurrentMovePass = moveHistory[currentIndex - 1] === PASS_GRID;

  // matchType 0/1 は通常の手番順、それ以外は反転した手番順
  const isNormalOrder = isNoOkiishi(matchType);
  const lastMoveWasBlack = isNormalOrder
    ? currentIndex % 2 === 1
    : currentIndex % 2 === 0;
  const isBlackPass = isCurrentMovePass && lastMoveWasBlack;
  const isWhitePass = isCurrentMovePass && !lastMoveWasBlack;

  const resultText =
    resultToComment(record.result ?? "", isPlayerBlack ? BLACK : WHITE, t) ??
    t("MyRecords.unknown");
  const dateText = new Date(record.created_at).toLocaleDateString(lang, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // 勝敗で変わるのはこの3色だけ
  const borderColor =
    playerWin === true
      ? COLORS.green
      : playerWin === false
        ? COLORS.coral
        : COLORS.backgroundDark;
  const accentColor =
    playerWin === true
      ? COLORS.green
      : playerWin === false
        ? COLORS.coral
        : COLORS.text;
  const dateColor = playerWin === undefined ? COLORS.textSub : accentColor;

  const currentAgehama = agehamaHistory[currentIndex];

  // カードのwidthから碁盤の幅を決定（測定前はフォールバック値）
  // 左右に余白（合計24pxなど）を持たせたい場合は Math.max(0, cardWidth - 24) のように調整してね社長
  const boardWidth =
    (cardHeight > cardWidth * 1.4 ? cardWidth * 0.78 : cardHeight * 0.56) * 1.2;
  return (
    <View
      onLayout={handleLayout}
      className="justify-between items-center rounded-3xl overflow-hidden bg-foreground border-4"
      style={{ height: cardHeight, borderColor }}
    >
      <View className="w-full flex-row items-end px-2 pt-2.5 pb-2">
        <PlayerCell
          isLeft
          username={self(record.black_username, record.white_username)}
          iconIndex={
            self(record.black_icon_index, record.white_icon_index) ?? 0
          }
          rankIndex={
            self(record.black_rank_index, record.white_rank_index) ?? 0
          }
          color={isPlayerBlack ? BLACK : WHITE}
          showPass={isPlayerBlack ? isBlackPass : isWhitePass}
          agehamaCount={self(currentAgehama.black, currentAgehama.white)}
        />

        <View className="pt-3 w-[72px] flex-col items-center justify-evenly">
          <Text
            className="text-[10px] text-center leading-[14px]"
            style={{ color: dateColor }}
            numberOfLines={2}
          >
            {dateText}
          </Text>
          <Text
            className="text-[11px] font-semibold text-center leading-[15px]"
            style={{ color: accentColor }}
            numberOfLines={2}
          >
            {resultText}
          </Text>
        </View>

        <PlayerCell
          isLeft={false}
          username={opp(record.black_username, record.white_username)}
          iconIndex={opp(record.black_icon_index, record.white_icon_index) ?? 0}
          rankIndex={opp(record.black_rank_index, record.white_rank_index) ?? 0}
          color={!isPlayerBlack ? BLACK : WHITE}
          showPass={!isPlayerBlack ? isBlackPass : isWhitePass}
          agehamaCount={opp(currentAgehama.black, currentAgehama.white)}
        />
      </View>

      <GoBoard
        boardSize={boardSize}
        boardWidth={boardWidth}
        agehamaHistory={agehamaHistory}
        board={boardHistory[currentIndex] ?? {}}
        onPutStone={() => {}}
        moveHistory={moveHistory}
        territoryBoard={territoryBoard}
        disabled={true}
        isGameEnded={true}
        boardHistory={boardHistory}
        currentIndex={currentIndex}
      />

      <ReplayControls
        onCurrentIndexChange={setCurrentIndex}
        currentIndex={currentIndex}
        maxIndex={boardHistory.length - 1}
      />
    </View>
  );
};

// ===== プレイヤーセル（左右共通） =====
type PlayerCellProps = {
  isLeft: boolean;
  username: string;
  iconIndex: number;
  rankIndex: number;
  color: Color;
  showPass: boolean;
  agehamaCount: number;
};

const PlayerCell = ({
  isLeft,
  username,
  iconIndex,
  rankIndex,
  color,
  showPass,
  agehamaCount,
}: PlayerCellProps) => {
  return (
    <View className={`flex-1 flex-col ${isLeft ? "items-start" : "items-end"}`}>
      <View
        className={`flex-row items-center gap-1.5 ${
          !isLeft ? "flex-row-reverse" : ""
        }`}
      >
        <AvatarWithPass
          rankIndex={rankIndex}
          iconIndex={iconIndex}
          size={48}
          color={color}
          isLeft={isLeft}
          showPass={showPass}
        />
        <View
          className={`flex-col gap-1 flex-1 ${
            isLeft ? "items-start" : "items-end"
          }`}
        >
          <Text
            className={`text-sm font-medium text-text ${
              isLeft ? "text-left" : "text-right flex-shrink"
            }`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {username}
          </Text>
          <AgehamaDisplay count={agehamaCount} />
        </View>
      </View>
    </View>
  );
};
