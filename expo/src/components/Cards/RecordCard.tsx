// RecordCard.tsx
import { SkeletonCard } from "@/src/components/Cards/SkeletonCard";
import { AgehamaDisplay } from "@/src/components/GoComponents/Agehama";
import { Avatar } from "@/src/components/GoComponents/Avatar";
import { GoBoard } from "@/src/components/GoComponents/GoBoard";
import { Pass } from "@/src/components/GoComponents/Pass";
import { ReplayControls } from "@/src/components/GoComponents/ReplayControls";
import { CHOCOLATE, CHOCOLATE_SUB } from "@/src/constants/colors";
import { Agehama, MatchArchive } from "@/src/constants/goConstants";
import { Board } from "@/src/lib/goLogics";
import { resultToSelfComment } from "@/src/lib/goUtils";
import { wrapBotDisplayname } from "@/src/lib/utils";
import React, { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

const isPlaceholder = (r: MatchArchive) => (r.id as number) < 0;

export type Props = {
  record: MatchArchive;
  boardHistory: Board[];
  moves: string[];
  agehamaHistory: Agehama[];
  territoryBoard: number[][] | undefined;
  matchType: number;
  cardHeight: number;
  t: any;
  currentLocale: string;
  /** 自分が勝ったか負けたか。未定義の場合はニュートラル表示 */
  playerWin?: boolean;
  isPlayerBlack: boolean;
};

export const RecordCard = ({
  record,
  boardHistory,
  moves,
  agehamaHistory,
  territoryBoard,
  matchType,
  cardHeight,
  t,
  currentLocale,
  playerWin,
  isPlayerBlack,
}: Props) => {
  const { width } = useWindowDimensions();
  const boardWidth = cardHeight * 0.4;
  const playerColor = isPlayerBlack ? "black" : "white";
  const [currentIndex, setCurrentIndex] = useState(0);
  const isReady = !isPlaceholder(record) && !!territoryBoard;
  const moveHistory = moves?.slice(0, currentIndex + 1) ?? [];
  const currentMove = moveHistory[currentIndex - 1];
  const isCurrentMovePass = currentMove === "p";
  const isBlackPass =
    isCurrentMovePass &&
    ((currentIndex % 2 === 1 && (matchType === 0 || matchType === 1)) ||
      (currentIndex % 2 === 0 && matchType !== 0 && matchType !== 1));
  const isWhitePass =
    isCurrentMovePass &&
    ((currentIndex % 2 === 0 && (matchType === 0 || matchType === 1)) ||
      (currentIndex % 2 === 1 && matchType !== 0 && matchType !== 1));

  const result = record.result;
  const createdAt = record.created_at;
  const myDisplayname = isPlayerBlack
    ? record.black_displayname
    : record.white_displayname;
  const oppDisplayname = wrapBotDisplayname(
    !isPlayerBlack ? record.black_displayname : record.white_displayname,
    t,
  );
  const myIconIndex = isPlayerBlack
    ? record.black_icon_index
    : record.white_icon_index;
  const oppIconIndex = !isPlayerBlack
    ? record.black_icon_index
    : record.white_icon_index;
  const myGumiIndex = isPlayerBlack
    ? record.black_gumi_index
    : record.white_gumi_index;
  const oppGumiIndex = !isPlayerBlack
    ? record.black_gumi_index
    : record.white_gumi_index;

  if (!isReady) return <SkeletonCard height={cardHeight} />;

  // 結果
  const resultText =
    resultToSelfComment(result ?? "", playerColor, t) ?? t("MyRecords.unknown");
  // 日付
  const dateText = new Date(createdAt).toLocaleDateString(currentLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // isWin の値に応じてテーマを切り替える
  const theme =
    playerWin === true
      ? themes.win
      : playerWin === false
        ? themes.lose
        : themes.neutral;

  return (
    <View style={[styles.card, { height: cardHeight }, theme.card]}>
      {/* ── プレイヤー行 ── */}
      <View style={[styles.playersRow, theme.divider]}>
        {/* 自分（左） */}
        <View style={styles.playerCell}>
          <View style={styles.passSlot}>
            <Pass
              visible={isPlayerBlack ? isBlackPass : isWhitePass}
              isLeft={true}
            />
          </View>
          <View style={styles.playerMain}>
            <Avatar
              gumiIndex={myGumiIndex}
              iconIndex={myIconIndex}
              size={40}
              color={isPlayerBlack ? "black" : "white"}
            />
            <View style={styles.playerInfo}>
              <Text
                style={[styles.playerName, theme.text]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {myDisplayname}
              </Text>
              <AgehamaDisplay
                count={
                  isPlayerBlack
                    ? agehamaHistory[currentIndex].black
                    : agehamaHistory[currentIndex].white
                }
              />
            </View>
          </View>
        </View>

        {/* 中央メタスロット */}
        <View style={styles.metaSlot}>
          {/* 日付 */}
          <Text style={[styles.metaDate, theme.metaDate]} numberOfLines={2}>
            {dateText}
          </Text>
          {/* 結果 */}
          <Text style={[styles.metaResult, theme.metaResult]} numberOfLines={2}>
            {resultText}
          </Text>
        </View>

        {/* 相手（右） */}
        <View style={[styles.playerCell, styles.playerCellRight]}>
          <View style={[styles.passSlot, styles.passSlotRight]}>
            <Pass
              visible={!isPlayerBlack ? isBlackPass : isWhitePass}
              isLeft={false}
            />
          </View>
          <View style={[styles.playerMain, styles.playerMainRight]}>
            <Avatar
              gumiIndex={oppGumiIndex}
              iconIndex={oppIconIndex}
              size={40}
              color={!isPlayerBlack ? "black" : "white"}
            />
            <View style={[styles.playerInfo, styles.playerInfoRight]}>
              <Text
                style={[
                  styles.playerName,
                  theme.text,
                  styles.playerNameRight,
                  { flexShrink: 1 },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {oppDisplayname}
              </Text>
              <AgehamaDisplay
                count={
                  !isPlayerBlack
                    ? agehamaHistory[currentIndex].black
                    : agehamaHistory[currentIndex].white
                }
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── 碁盤 ── */}
      <View style={styles.boardWrapper}>
        <GoBoard
          boardWidth={cardHeight * 0.5}
          matchType={matchType}
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
      </View>


      {/* ── リプレイコントロール ── */}
        <ReplayControls
          onCurrentIndexChange={setCurrentIndex}
          currentIndex={currentIndex}
          maxIndex={boardHistory.length - 1}
        />
    </View>
  );
};

// ===== テーマ定義 =====
const themes = {
  win: {
    card: {
      backgroundColor: "#F3FAF0",
      borderColor: "rgba(80,160,60,0.25)",
      borderWidth: 0.5,
    },
    divider: { borderBottomColor: "rgba(80,160,60,0.1)" },
    controls: { borderTopColor: "rgba(80,160,60,0.1)" },
    text: { color: "#1a1a1a" },
    metaResult: { color: "#2d6e1a" },
    metaDate: { color: "#6a9e5a" },
  },
  lose: {
    card: {
      backgroundColor: "#FAF5F5",
      borderColor: "rgba(160,80,80,0.18)",
      borderWidth: 0.5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    divider: { borderBottomColor: "rgba(160,80,80,0.08)" },
    controls: { borderTopColor: "rgba(160,80,80,0.08)" },
    text: { color: "#1a1a1a" },
    metaResult: { color: "#8a3a3a" },
    metaDate: { color: "#b07070" },
  },
  // ニュートラル（isWin 未指定時）
  neutral: {
    card: {
      backgroundColor: "#ffffff",
      borderColor: "rgba(0,0,0,0.08)",
      borderWidth: 0.5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    divider: { borderBottomColor: "rgba(0,0,0,0.06)" },
    controls: { borderTopColor: "rgba(0,0,0,0.06)" },
    text: { color: "#1a1a1a" },
    metaResult: { color: CHOCOLATE },
    metaDate: { color: CHOCOLATE_SUB },
  },
};

// ===== 位置調整用定数 =====
const PASS_SLOT_HEIGHT = 28;
const PASS_OVERLAP = 10;
// ==========================

const styles = StyleSheet.create({
  card: {
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    overflow: "hidden",
  },

  // ── プレイヤー行 ──
  playersRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },

  playerCell: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  playerCellRight: {
    alignItems: "flex-end",
  },

  passSlot: {
    height: PASS_SLOT_HEIGHT,
    marginBottom: -PASS_OVERLAP,
    justifyContent: "flex-end",
    alignSelf: "stretch",
    zIndex: 1,
  },
  passSlotRight: {
    alignItems: "flex-end",
  },

  hidden: {
    opacity: 0,
  },

  playerMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playerMainRight: {
    flexDirection: "row-reverse",
  },
  playerInfo: {
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  playerInfoRight: {
    alignItems: "flex-end",
  },
  playerName: {
    fontSize: 13,
    fontWeight: "500",
  },
  playerNameRight: {
    textAlign: "right",
  },

  // ── 中央メタスロット ──
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

  // ── 碁盤 ──
  boardWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafaf8",
  },
});
