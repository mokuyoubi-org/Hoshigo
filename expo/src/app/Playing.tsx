// Playing.tsx

// ---------------- 手の適用(applymove)タイミング ----------------
// 自分: すぐに適用し、もし通信エラーなら取り消す。
// 相手orボット: broadcastで届いて初めて適用する。

// ---------------- turnの更新タイミング ----------------
// 自分: 手と同じ。
// 相手orボット: 手と同じ。
// ※ 時間はturnに従う

import { AgehamaDisplay } from "@/src/active/components/go/Agehama";
import { AvatarWithPass } from "@/src/active/components/go/AvatarWithPass";
import { GoBoard } from "@/src/active/components/go/Board";
import { ReplayControls } from "@/src/active/components/go/ReplayControls";
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { ResultModal } from "@/src/active/components/modals/ResultModal";
import { COLORS } from "@/src/active/constants/colors";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useMatchSession } from "@/src/active/hooks/useMatchSession";
import { secondsToMinutes } from "@/src/active/logics/utilLogics";
import {
  BLACK,
  BoardSize,
  Color,
  MatchType,
  PASS_GRID,
  WHITE,
} from "@/src/stable/types/goTypes";
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "../active/contexts/ProfileContexts";
import { useTranslation } from "../active/hooks/useTranslation";

export default function Playing() {
  // gameChannel関連はuseMatchSessionに集約されたので、
  // ここではuser_finished(対局後のポイント変動通知)の購読だけ使う。
  const { onUserFinished } = useMatching();
  const t = useTranslation();
  const { profile, updateProfile } = useProfile();
  const { iconIndex, points9, points13, groupIndex9, groupIndex13 } = profile;
  const { height, width } = useWindowDimensions();
  const boardWidth = Math.min(width * 0.82, height * 0.5);
  const [pointsBefore, setPointsBefore] = useState(0);
  const [groupIndexBefore, setGroupIndexBefore] = useState(0);
  const [pointsAfter, setPointsAfter] = useState(0);
  const [groupIndexAfter, setGroupIndexAfter] = useState(0);

  // ─── パラメータ ───────────────────────────────────────
  type Params = {
    matchId: string; // マッチid
    boardSize: string;
    matchType: string; // マッチのタイプ
    moves: string; // moves
    myColor: string; // 自分の色
    oppUsername: string; // 相手の表示名
    oppGroupIndex: string; // 相手のぐみ
    oppIconIndex: string; // 相手のアイコン
    mySeconds: string; // 自分の残り秒数
    oppSeconds: string; // 相手の残り秒数
    botMatch: string;
  };
  const params = useLocalSearchParams<Params>();
  const matchId = Number(params.matchId); // マッチid
  const matchType = Number(params.matchType ?? 0) as MatchType; // マッチのタイプ
  const movesInt: number[] = JSON.parse(params.moves); // move
  const myColor: Color = params.myColor === "black" ? BLACK : WHITE;
  const oppColor: Color = myColor === WHITE ? BLACK : WHITE;
  const oppUsername: string = params.oppUsername;
  const oppGroupIndex = Number(params.oppGroupIndex);
  const oppIconIndex = Number(params.oppIconIndex);
  const boardSize = Number(params.boardSize) as BoardSize;
  const botMatch = params.botMatch === "true";

  // ─── 音 ──────────────────────────────────────────────
  const soundFile = require("@/assets/sounds/stone.mp3");
  const stonePlayer = useAudioPlayer(soundFile);
  const playStoneSound = () => {
    stonePlayer.seekTo(0);
    stonePlayer.play();
  };

  // ─── 対局セッション(盤面・ボット・時間・チャンネル、全部ここに集約) ─────
  const {
    boardHistory,
    boardHistoryRef,
    agehamaHistory,
    movesRef,
    currentIndex,
    setCurrentIndex,
    territoryBoardRef,
    goToLatest,
    isMyTurn,
    mySeconds,
    oppSeconds,
    isGameEnded,
    resultComment,
    loading,
    setLoading,
    handlePutStone,
    handleResign,
  } = useMatchSession({
    matchId,
    myColor,
    oppColor,
    boardSize,
    matchType,
    movesInt,
    botMatch,
    initialMySeconds: Number(params.mySeconds),
    initialOppSeconds: Number(params.oppSeconds),
    t,
    onOwnMoveApplied: playStoneSound,
  });

  //
  const moveHistory = movesRef.current?.slice(0, currentIndex + 1) ?? [];
  const currentMove = moveHistory[currentIndex - 1];
  const isCurrentMovePass = currentMove === PASS_GRID;
  const isBlackPass =
    isCurrentMovePass &&
    ((currentIndex % 2 === 1 && (matchType === 0 || matchType === 1)) ||
      (currentIndex % 2 === 0 && matchType !== 0 && matchType !== 1));

  const isWhitePass =
    isCurrentMovePass &&
    ((currentIndex % 2 === 0 && (matchType === 0 || matchType === 1)) ||
      (currentIndex % 2 === 1 && matchType !== 0 && matchType !== 1));

  const pointsRef = useRef(boardSize === 9 ? points9 : points13);
  const groupIndexRef = useRef(boardSize === 9 ? groupIndex9 : groupIndex13);

  // ─── 初期化 ───────────────────────────────────────────
  useEffect(() => {
    if (!matchId) {
      router.replace("/(tabs)/Home");
    }

    setPointsBefore((boardSize === 9 ? points9 : points13) ?? 0);
    setGroupIndexBefore((boardSize === 9 ? groupIndex9 : groupIndex13) ?? 0);
  }, []);

  // state が変わったら ref にもコピー
  useEffect(() => {
    pointsRef.current = boardSize === 9 ? points9 : points13;
    groupIndexRef.current = boardSize === 9 ? groupIndex9 : groupIndex13;
  }, []);

  const [showResult, setShowResult] = useState(false);

  // ─── userチャンネルのfinishedイベント: 終局後のユーザ情報
  // 受け取るもの:
  // delta: 何ポイント下がったか、上がったか
  // new_points: 対局後のポイント
  // new_group_index: 対局後のぐみ
  // new_acquired_icons: 新たに獲得したアイコンの配列。なければ空配列
  const user_finished = (payload: any) => {
    const data = payload.payload ?? payload;

    setLoading(false);

    // new_points と new_group_index が数字じゃなかったら無視
    const maybePoints = Number(data.new_points);
    const maybeGroupIndex = Number(data.new_group_index);

    if (isNaN(maybePoints) || isNaN(maybeGroupIndex)) {
      console.warn("invalid payload:", data);
      return;
    }

    const oldPoints = (boardSize === 9 ? points9 : points13) ?? 0;
    const oldGroupIndex = (boardSize === 9 ? groupIndex9 : groupIndex13) ?? 0;

    setPointsBefore(oldPoints);
    setGroupIndexBefore(oldGroupIndex);

    setPointsAfter(maybePoints);
    setGroupIndexAfter(maybeGroupIndex);

    // グローバルstateもset
    updateProfile(
      boardSize === 9
        ? { points9: maybePoints, groupIndex9: maybeGroupIndex }
        : { points13: maybePoints, groupIndex13: maybeGroupIndex },
    );

    setShowResult(true);
    // ※ userChannel自体はMatchingContextがアカウントレベルで持ち続けるので、ここでは何も切らない。
  };

  // userChannelのuser_finished(対局後のポイント変動通知)を購読
  useEffect(() => {
    const unsubUserFinished = onUserFinished(user_finished);
    return () => {
      unsubUserFinished();
    };
  }, [onUserFinished, user_finished]);

  // ─── 結果OKボタン ──────────────────────────────────────
  const onPressOK = () => {
    setShowResult(false);
    goToLatest();
  };

  // ─── UI ──────────────────────────────────────────────

  if (!matchId) {
    return;
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* ─── ヘッダー ─── */}
        <View style={styles.header}>
          {/* 戻るボタン */}
          <TouchableOpacity
            style={[styles.backButton, !isGameEnded && { opacity: 0 }]}
            onPress={() => router.push("/(tabs)/Home")}
            activeOpacity={0.7}
            disabled={!isGameEnded}
          >
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>

          {/* 結果ボタン */}
          <TouchableOpacity
            style={[styles.backButton, !isGameEnded && { opacity: 0 }]}
            onPress={() => setShowResult(true)}
            activeOpacity={0.7}
            disabled={!isGameEnded}
          >
            <Text style={styles.backButtonText}>{t("common.result")}</Text>
          </TouchableOpacity>
        </View>

        {/* 相手情報 */}
        <View style={styles.playerMain}>
          <AvatarWithPass
            groupIndex={oppGroupIndex ?? 0}
            iconIndex={oppIconIndex ?? 0}
            size={48}
            color={oppColor}
            isLeft={true}
            showPass={oppColor === BLACK ? isBlackPass : isWhitePass}
          />
          <Text style={styles.timeText}>{oppUsername}</Text>
          <AgehamaDisplay
            count={
              oppColor === BLACK
                ? agehamaHistory[currentIndex].black
                : agehamaHistory[currentIndex].white
            }
          />
          <Text style={styles.timeText}>{secondsToMinutes(oppSeconds)}</Text>
        </View>

        {/* 碁盤 */}
        <GoBoard
          boardSize={boardSize}
          agehamaHistory={agehamaHistory}
          board={boardHistory[currentIndex] ?? {}}
          onPutStone={handlePutStone}
          moveHistory={movesRef.current}
          territoryBoard={territoryBoardRef.current}
          disabled={!isMyTurn || isGameEnded}
          isGameEnded={isGameEnded}
          boardHistory={boardHistory}
          currentIndex={currentIndex}
          boardWidth={boardWidth}
        />

        {/* 自分情報 */}
        <View style={[styles.playerMain, styles.playerMainRight]}>
          <AvatarWithPass
            groupIndex={(boardSize === 9 ? groupIndex9 : groupIndex13) ?? 0}
            iconIndex={iconIndex ?? 0}
            size={48}
            color={myColor}
            isLeft={false}
            showPass={myColor === BLACK ? isBlackPass : isWhitePass}
          />
          <AgehamaDisplay
            count={
              myColor === BLACK
                ? agehamaHistory[currentIndex].black
                : agehamaHistory[currentIndex].white
            }
          />
          <Text style={styles.timeText}>{secondsToMinutes(mySeconds)}</Text>
        </View>

        {!isGameEnded && (
          <View style={styles.actionsContainer}>
            {/* パスボタン */}
            <TouchableOpacity
              style={[
                styles.passButton,
                !isMyTurn && styles.passButtonDisabled,
              ]}
              onPress={() => {
                handlePutStone(PASS_GRID);
              }}
              disabled={!isMyTurn}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.passButtonText,
                  !isMyTurn && styles.passButtonTextDisabled,
                ]}
              >
                {t("common.pass")}
              </Text>
            </TouchableOpacity>

            {/* 投了ボタン */}
            <TouchableOpacity
              style={[
                styles.resignButton,
                !isMyTurn && styles.resignButtonDisabled,
              ]}
              onPress={handleResign}
              disabled={!isMyTurn}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resignButtonText,
                  !isMyTurn && styles.resignButtonTextDisabled,
                ]}
              >
                {t("common.resign")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── リプレイコントロール ── */}
        {isGameEnded && (
          <View style={[styles.controlsWrapper, { width: boardWidth * 1.2 }]}>
            <ReplayControls
              onCurrentIndexChange={setCurrentIndex}
              currentIndex={currentIndex}
              maxIndex={boardHistoryRef.current.length - 1}
            />
          </View>
        )}
      </View>

      {/* 結果モーダル */}
      <ResultModal
        boardSize={boardSize}
        visible={showResult}
        resultComment={resultComment}
        onPressOK={onPressOK}
        pointsBefore={pointsBefore}
        pointsAfter={pointsAfter}
        groupIndexBefore={groupIndexBefore}
        groupIndexAfter={groupIndexAfter}
        setLoading={setLoading}
      />

      {/* ローディングオーバーレイ */}
      <LoadingModal text={t("common.loading")} visible={loading} />
    </SafeAreaView>
  );
}
// ─── スタイル ───────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    width: "100%",
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    width: "100%",
  },

  timeText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  passButton: {
    flex: 1,
    backgroundColor: COLORS.foreground,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  passButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  passButtonDisabled: {
    borderColor: COLORS.backgroundDark,
    backgroundColor: COLORS.foreground,
  },

  passButtonTextDisabled: {
    color: COLORS.textSub,
  },
  resignButton: {
    flex: 1,
    backgroundColor: COLORS.foreground,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  resignButtonDisabled: {
    borderColor: COLORS.backgroundDark,
  },
  resignButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.danger,
  },
  resignButtonTextDisabled: {
    color: COLORS.textSub,
  },

  playerMain: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 6,
  },
  playerMainRight: {
    flexDirection: "row-reverse",
  },
  // ── コントロール ──
  controlsWrapper: {
    width: "100%",
    backgroundColor: "transparent",
  },
});
