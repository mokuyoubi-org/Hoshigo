// RecordCard.tsx
import {
  isSkeletonCard,
  SkeletonCard,
} from "@/src/active/components/cards/SkeletonCard";

import { AgehamaDisplay } from "@/src/active/components/go/Agehama";
import { AvatarWithPass } from "@/src/active/components/go/AvatarWithPass";
import { GoBoard } from "@/src/active/components/go/Board";
import { ReplayControls } from "@/src/active/components/go/ReplayControls";
import { COLORS } from "@/src/active/constants/colors";
import { Agehama, RecordType } from "@/src/active/types/matchTypes";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  PASS_GRID,
  WHITE,
} from "@/src/stable/types/goTypes";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLang } from "../../contexts/LangContext";
import { useTranslation } from "../../hooks/useTranslation";
import { resultToComment } from "../../logics/utilLogics";

export type Props = {
  record: RecordType;
  boardHistory: Board[];
  moves: Grid[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][] | undefined;
  matchType: number;
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
  const isReady = !isSkeletonCard(record) && !!territoryBoard;

  // 自分が黒番なら black 側、白番なら white 側の値を選ぶヘルパー
  const self = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? blackVal : whiteVal;
  const opp = <T,>(blackVal: T, whiteVal: T): T =>
    isPlayerBlack ? whiteVal : blackVal;

  const moveHistory = moves?.slice(0, currentIndex + 1) ?? [];
  const isCurrentMovePass = moveHistory[currentIndex - 1] === PASS_GRID;

  // matchType 0/1 は通常の手番順、それ以外は反転した手番順
  const isNormalOrder = matchType === 0 || matchType === 1;
  const lastMoveWasBlack = isNormalOrder
    ? currentIndex % 2 === 1
    : currentIndex % 2 === 0;
  const isBlackPass = isCurrentMovePass && lastMoveWasBlack;
  const isWhitePass = isCurrentMovePass && !lastMoveWasBlack;

  // 準備ができてなかったらスケルトンカード
  if (!isReady) return <SkeletonCard height={cardHeight} />;

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
      ? COLORS.safeLight
      : playerWin === false
        ? COLORS.dangerLight
        : COLORS.backgroundDark;
  const accentColor =
    playerWin === true
      ? COLORS.safe
      : playerWin === false
        ? COLORS.danger
        : COLORS.text;
  const dateColor = playerWin === undefined ? COLORS.textSub : accentColor;

  const currentAgehama = agehamaHistory[currentIndex];

  return (
    <View style={[styles.card, { height: cardHeight, borderColor }]}>
      <View style={styles.playersRow}>
        <PlayerCell
          isLeft
          username={self(record.black_username, record.white_username)}
          iconIndex={
            self(record.black_icon_index, record.white_icon_index) ?? 0
          }
          groupIndex={
            self(record.black_group_index, record.white_group_index) ?? 0
          }
          color={isPlayerBlack ? BLACK : WHITE}
          showPass={isPlayerBlack ? isBlackPass : isWhitePass}
          agehamaCount={self(currentAgehama.black, currentAgehama.white)}
        />

        <View style={styles.metaSlot}>
          <Text
            style={[styles.metaDate, { color: dateColor }]}
            numberOfLines={2}
          >
            {dateText}
          </Text>
          <Text
            style={[styles.metaResult, { color: accentColor }]}
            numberOfLines={2}
          >
            {resultText}
          </Text>
        </View>

        <PlayerCell
          isLeft={false}
          username={opp(record.black_username, record.white_username)}
          iconIndex={opp(record.black_icon_index, record.white_icon_index) ?? 0}
          groupIndex={
            opp(record.black_group_index, record.white_group_index) ?? 0
          }
          color={!isPlayerBlack ? BLACK : WHITE}
          showPass={!isPlayerBlack ? isBlackPass : isWhitePass}
          agehamaCount={opp(currentAgehama.black, currentAgehama.white)}
        />
      </View>

      <GoBoard
        boardSize={boardSize}
        boardWidth={cardHeight * 0.5}
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
  groupIndex: number;
  color: Color;
  showPass: boolean;
  agehamaCount: number;
};

const PlayerCell = ({
  isLeft,
  username,
  iconIndex,
  groupIndex,
  color,
  showPass,
  agehamaCount,
}: PlayerCellProps) => {
  const align = isLeft ? "flex-start" : "flex-end";
  return (
    <View style={[styles.playerCell, { alignItems: align }]}>
      <View style={[styles.playerMain, !isLeft && styles.rowReverse]}>
        <AvatarWithPass
          groupIndex={groupIndex}
          iconIndex={iconIndex}
          size={48}
          color={color}
          isLeft={isLeft}
          showPass={showPass}
        />
        <View style={[styles.playerInfo, { alignItems: align }]}>
          <Text
            style={[
              styles.playerName,
              { textAlign: isLeft ? "left" : "right" },
              !isLeft && styles.shrink,
            ]}
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

// ===== スタイル =====
const styles = StyleSheet.create({
  card: {
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.foreground,
    borderWidth: 2,
  },
  playersRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  playerCell: {
    flex: 1,
    flexDirection: "column",
  },
  playerMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  playerInfo: {
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  shrink: {
    flexShrink: 1,
  },
  metaSlot: {
    paddingTop: 12,
    width: 72,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  metaResult: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 15,
  },
  metaDate: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
});
