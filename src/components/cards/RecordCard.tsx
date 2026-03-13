import { SkeletonCard } from "@/src/components/cards/SkeletonCard";
import { GoBoard } from "@/src/components/goComponents/GoBoard";
import { CHOCOLATE, CHOCOLATE_SUB } from "@/src/constants/colors";
import { Agehama, MatchArchive } from "@/src/constants/goConstants";
import { Board } from "@/src/lib/goLogics";
import { resultToLanguages } from "@/src/lib/goUtils";
import React, { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AgehamaDisplay } from "../goComponents/Agehama";
import { Avatar } from "../goComponents/Avatar";
import { Pass } from "../goComponents/Pass";
import { ReplayControls } from "../goComponents/ReplayControls";

const isPlaceholder = (r: MatchArchive) => (r.id as number) < 0;

export type RecordCardProps = {
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
  isWin?: boolean;
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
  isWin,
}: RecordCardProps) => {
  const { height } = useWindowDimensions();
  const [currentIndex, setReplayIndex] = useState(0);

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

  if (!isReady) return <SkeletonCard height={cardHeight} />;

  const boardSize = (height * 36) / 100;

  const resultText =
    resultToLanguages(record.result ?? "", t) ?? t("MyRecords.unknown");
  const dateText = new Date(record.created_at).toLocaleDateString(
    currentLocale,
    { month: "short", day: "numeric", year: "numeric" },
  );

  const matchTypeToText = (matchType: number, t: any): string => {
    return t(`GoTerms.matchType${matchType}`);
  };
  const matchTypeText = matchTypeToText(matchType, t);

  // isWin の値に応じてテーマを切り替える
  const theme =
    isWin === true
      ? themes.win
      : isWin === false
        ? themes.lose
        : themes.neutral;

  return (
    <View style={[styles.card, { height: cardHeight }, theme.card]}>
      {/* ── プレイヤー行 ── */}
      <View style={[styles.playersRow, theme.divider]}>
        {/* 黒番（左） */}
        <View style={styles.playerCell}>
          <View style={styles.passSlot}>
            <View style={isBlackPass ? undefined : styles.hidden}>
              <Pass isBlackPass={true} />
            </View>
          </View>
          <View style={styles.playerMain}>
            <Avatar
              gumiIndex={record.black_gumi_index ?? 0}
              iconIndex={record.black_icon_index}
              size={40}
              color="black"
            />
            <View style={styles.playerInfo}>
              <Text style={[styles.playerName, theme.text]} numberOfLines={1}>
                {record.black_displayname}
              </Text>
              <AgehamaDisplay
                count={agehamaHistory[currentIndex].black}
                t={t}
              />
            </View>
          </View>
        </View>

        {/* 中央メタスロット */}
        <View style={styles.metaSlot}>
          <Text style={[styles.metaDate, theme.metaDate]} numberOfLines={2}>
            {dateText}
          </Text>
          {/* <Text style={[styles.metaResult, theme.metaResult]} numberOfLines={2}>
            {matchTypeText}
          </Text> */}

          <Text style={[styles.metaResult, theme.metaResult]} numberOfLines={2}>
            {resultText}
          </Text>
        </View>

        {/* 白番（右） */}
        <View style={[styles.playerCell, styles.playerCellRight]}>
          <View style={[styles.passSlot, styles.passSlotRight]}>
            <View style={isWhitePass ? undefined : styles.hidden}>
              <Pass isBlackPass={false} />
            </View>
          </View>
          <View style={[styles.playerMain, styles.playerMainRight]}>
            <Avatar
              gumiIndex={record.white_gumi_index ?? 0}
              iconIndex={record.white_icon_index}
              size={40}
              color="white"
            />
            <View style={[styles.playerInfo, styles.playerInfoRight]}>
              <Text
                style={[styles.playerName, theme.text, styles.playerNameRight]}
                numberOfLines={1}
              >
                {record.white_displayname ?? "CPU"}
              </Text>
              <AgehamaDisplay
                count={agehamaHistory[currentIndex].white}
                t={t}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── 碁盤 ── */}
      <View style={styles.boardWrapper}>
        <GoBoard
          boardWidth={boardSize}
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
      <View style={[styles.controlsWrapper, theme.controls]}>
        <ReplayControls
          onCurrentIndexChange={setReplayIndex}
          currentIndex={currentIndex}
          maxIndex={boardHistory.length - 1}
        />
      </View>
    </View>
  );
};

// ===== テーマ定義 =====
// 色を変えたい場合はここだけ編集すればOK

const themes = {
  // 勝ち: W2 · green tint
  win: {
    card: {
      backgroundColor: "#F3FAF0",
      borderColor: "rgba(80,160,60,0.25)",
      borderWidth: 0.5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    divider: { borderBottomColor: "rgba(80,160,60,0.1)" },
    controls: { borderTopColor: "rgba(80,160,60,0.1)" },
    text: { color: "#1a1a1a" },
    metaResult: { color: "#2d6e1a" },
    metaDate: { color: "#6a9e5a" },
  },
  // 負け: L3 · dusty rose
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
    alignItems: "center",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
  },

  // ── プレイヤー行 ──
  playersRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
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
    gap: 8,
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
    paddingTop:12,
    height: "100%",
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
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafaf8",
  },

  // ── コントロール ──
  controlsWrapper: {
    width: "100%",
    borderTopWidth: 0.5,
    backgroundColor: "transparent",
  },
});
