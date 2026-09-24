// GameScreen.tsx
// 2026/08/29
// ロジックのことはuseMatchSessionが管理役を務める。
// UIのことはGameScreenが管理役を務める。
// ということで、useEffectでモーダルを表示したりする処理はこちらに書いてあります。
// stateを変更した、その場ではなく、こちらでstateの変更に気づいて発火するようになっています。
import { PlayerCard } from "@/src/active/components/cards/PlayerCard";
import { GameResultModal } from "@/src/active/components/modals/gameresult/GameResultModal";
import { GameStartModal } from "@/src/active/components/modals/GameStartModal";
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useMatchSession } from "@/src/active/hooks/match/useMatchSession";
import { useTranslation } from "@/src/active/i18n";
import {
  GameScreenParams,
  getPassState,
  parseGameParams,
} from "@/src/stable/logics/gameScreenLogics";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { buildRecordFromMatch } from "@/src/stable/logics/recordBuilder";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import { FontAwesome6 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GoBoard } from "go-components";
import { BLACK, Grid, PASS_GRID } from "go-core";
import React, { useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKVStorage } from "storage-kit";
import { IconButton } from "ui-atoms";
import { clearPeriodicCache } from "../stable/logics/syncUtils";

// ─── レイアウト定数 ───
const LAYOUT_CONFIG = {
  // 余白の比率（flex）を設定する
  // A: ヘッダーと三兄弟の間のスペーサー
  // B: 三兄弟と二兄弟の間のスペーサー
  // C: 二兄弟の下のスペーサー
  FLEX_A: 1,
  FLEX_B: 1,
  FLEX_C: 2,
};

// 盤面サイズの調整（画面幅・高さに対する割合）
const BOARD_WIDTH_RATIO = 0.94;
const BOARD_HEIGHT_RATIO = 0.6;

export default function GameScreen() {
  // ---------- stateなど ----------
  // その他
  const t = useTranslation();
  const { show, hide } = useOverlay();
  const { value: doubleTap9 } = useKVStorage<boolean>(
    "global.doubleTap9",
    false,
  );
  const { value: doubleTap13 } = useKVStorage<boolean>(
    "global.doubleTap13",
    true,
  );
  const { value: doubleTap19 } = useKVStorage<boolean>(
    "global.doubleTap19",
    true,
  );
  const { value: isSoundEnabled } = useKVStorage<boolean>(
    "global.sound",
    false,
  );
  // 碁盤サイズ
  const { height, width } = useWindowDimensions();
  const boardWidth = Math.min(
    width * BOARD_WIDTH_RATIO,
    height * BOARD_HEIGHT_RATIO,
  );
  // 対局する人の情報
  const { uid, iconIndex, username, rating9, rating13, rating19 } =
    useProfile();
  const [rank9, rank13, rank19] = [
    getRankInfo(rating9, t),
    getRankInfo(rating13, t),
    getRankInfo(rating19, t),
  ];
  const params = useLocalSearchParams<GameScreenParams>();
  const {
    matchId,
    matchType,
    movesInt,
    myColor,
    oppColor,
    boardSize,
    botMatch,
    oppUsername,
    oppRating,
    oppIconIndex,
    oppUid,
  } = parseGameParams(params);
  const myRankIndex =
    (boardSize === 9
      ? rank9.index
      : boardSize === 13
        ? rank13.index
        : rank19.index) ?? 0;
  const myRating =
    (boardSize === 9 ? rating9 : boardSize === 13 ? rating13 : rating19) ?? 0;

  // 🌟useMatchSession呼び出し！
  const {
    boardHistory,
    agehamaHistory,
    moves,
    currentIndex,
    territoryBoard,
    isMyTurn,
    mySeconds,
    oppSeconds,
    isGameEnded,
    resultComment,
    loading,
    handlePutStone,
    handleResign,
    turnState,
    ratingBefore,
    ratingAfter,
    rankIndexBefore,
    rankIndexAfter,
    resultRaw,
    finalDeadStones,
    analysis,
    giantKillingStreak,
    giantKillingStreakBonusApplied,
  } = useMatchSession({
    matchId,
    myColor,
    oppColor,
    boardSize,
    matchType,
    movesInt,
    botMatch,
    oppUsername,
    initialMySeconds: Number(params.mySeconds),
    initialOppSeconds: Number(params.oppSeconds),
  });

  // 対局自体の情報
  const moveHistory = moves?.slice(0, currentIndex + 1) ?? [];
  const { isBlackPass, isWhitePass } = getPassState(
    currentIndex,
    moveHistory,
    matchType,
  );

  // ---------- 関数定義 ----------

  // 対局開始モーダルや、結果モーダルを閉じた時の処理
  const onClose = () => {
    hide();
  };

  // iボタン押した時には、対局開始モーダルを表示。useEffectでも使うのでここに出してある
  // 音も鳴らす
  const showGameStartModal = () => {
    const isMyBlack = myColor === BLACK;

    const blackPlayer = isMyBlack
      ? {
          username: username ?? "",
          iconIndex: iconIndex ?? 0,
          ratingOrRank: myRankIndex,
          isRankIndex: true,
        }
      : {
          username: oppUsername ?? "",
          iconIndex: oppIconIndex ?? 0,
          ratingOrRank: oppRating ?? 0,
          isRankIndex: false,
        };

    const whitePlayer = isMyBlack
      ? {
          username: oppUsername ?? "",
          iconIndex: oppIconIndex ?? 0,
          ratingOrRank: oppRating ?? 0,
          isRankIndex: false,
        }
      : {
          username: username ?? "",
          iconIndex: iconIndex ?? 0,
          ratingOrRank: myRankIndex,
          isRankIndex: true,
        };

    show(
      <GameStartModal
        blackPlayer={blackPlayer}
        whitePlayer={whitePlayer}
        matchType={matchType}
        onClose={hide}
      />,
    );
  };

  // resultボタン押した時には、結果モーダルを表示。useEffectでも使うのでここに出してある
  const showResultModal = () => {
    show(
      <GameResultModal
        boardSize={boardSize}
        visible={true}
        resultComment={resultComment}
        onClose={onClose}
        ratingBefore={ratingBefore}
        ratingAfter={ratingAfter}
        rankIndexBefore={rankIndexBefore}
        rankIndexAfter={rankIndexAfter}
        from={"GameScreen"}
        giantKillingStreak={giantKillingStreak}
        giantKillingStreakBonusApplied={giantKillingStreakBonusApplied}
      />,
    );
  };

  // ---------- useEffect ----------

  // 🛡️ガード
  useEffect(() => {
    if (!matchId) {
      setTimeout(() => {
        router.replace({
          pathname: "/HomeScreen",
        });
      }, 0);
    }
  }, []);

  // 【役割】開始画面を表示。
  // 【発火条件】matchIdが変わった時、つまり
  // 1. 遷移してきた時、もしくは
  // 2. リプレイボタンを押して新規対局の時。
  useEffect(() => {
    if (matchId && !isGameEnded) {
      showGameStartModal();
    }
  }, [matchId]);

  // 【役割】結果画面を表示。
  // 【発火条件】対局が終わった時、もしくはresultボタンを押した時。
  // isGameEndedは対局が終了しているか否か。
  useEffect(() => {
    if (isGameEnded) {
      const isMyBlack = myColor === BLACK;
      const oppRankIndex = getRankInfo(oppRating, t).index;

      const record = buildRecordFromMatch({
        matchId,
        boardSize,
        matchType,
        moves: moves ?? [],
        deadStones: finalDeadStones,
        result: resultRaw,
        blackUid: isMyBlack ? (uid ?? "") : oppUid,
        blackUsername: isMyBlack ? (username ?? "") : (oppUsername ?? ""),
        blackIconIndex: isMyBlack ? (iconIndex ?? 0) : (oppIconIndex ?? 0),
        blackRankIndex: isMyBlack ? rankIndexAfter : oppRankIndex,
        blackRating: isMyBlack ? ratingAfter : (oppRating ?? 0),
        whiteUid: isMyBlack ? oppUid : (uid ?? ""),
        whiteUsername: isMyBlack ? (oppUsername ?? "") : (username ?? ""),
        whiteIconIndex: isMyBlack ? (oppIconIndex ?? 0) : (iconIndex ?? 0),
        whiteRankIndex: isMyBlack ? oppRankIndex : rankIndexAfter,
        whiteRating: isMyBlack ? (oppRating ?? 0) : ratingAfter,
        analysis,
      });

      // 🐱 分析結果込みでローカルにも保存しておく。INSERT OR IGNOREなので、
      //    後からsyncNewerがサーバー版(analysisを持たない)を取ってきても
      //    上書きされず、この時点のanalysisがそのまま残り続ける。
      const saveAndNavigate = async () => {
        try {
          await recordsRepo.insertMany([record]);
        } catch (e) {
          console.error("対局記録のローカル保存に失敗:", e);
        }

        router.replace({
          pathname: "/BoardEditScreen",
          params: {
            matchId: matchId,
            from: "GameScreen",
            resultComment: resultComment,
            rankIndexBefore: rankIndexBefore,
            rankIndexAfter: rankIndexAfter,
            ratingBefore: ratingBefore,
            ratingAfter: ratingAfter,
            giantKillingStreak: giantKillingStreak,
            giantKillingStreakBonusApplied: String( // なんか、booleanは明示的にキャストしなきゃいけないみたいだ。
              giantKillingStreakBonusApplied,
            ),
          },
        });

        showResultModal();
      };

      clearPeriodicCache("global_rankings"); // ランキングのキャッシュ消しておく(レートが変動するから)

      saveAndNavigate();
    }
  }, [isGameEnded]);

  // ---------- UI ----------
  // 🛡️ガード
  if (!matchId) return null;

  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <StatusBar style="dark" />

      <View className="flex-1 px-6 py-5 items-center w-full max-w-[680px] mx-auto">
        {/* ─── ヘッダー ─── */}
        <View className="w-full mb-2 flex-row justify-between">
          {/* ─── infoボタン ─── */}
          <IconButton
            icon={<FontAwesome6 name="info" />}
            color={COLORS.primary}
            onPress={showGameStartModal}
          />
        </View>

        {/* ─── 余白 A ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_A }} />

        {/* ─── 三兄弟 ─── */}
        <View className="items-center gap-2">
          {/* 相手情報 */}
          <View style={{ width: boardWidth }}>
            <PlayerCard
              username={oppUsername ?? ""}
              iconIndex={oppIconIndex ?? 0}
              rating={oppRating ?? 0}
              color={oppColor}
              isLeft={true}
              showPass={oppColor === BLACK ? isBlackPass : isWhitePass}
              agehamaCount={
                oppColor === BLACK
                  ? agehamaHistory[currentIndex].black
                  : agehamaHistory[currentIndex].white
              }
              seconds={oppSeconds}
              isMyTurn={turnState === oppColor} // 🥶 frozen中はここもfalseになる(以前は誤ってtrueになってた)
            />
          </View>

          {/* 碁盤 */}
          <GoBoard
            // 盤面サイズ: 1
            boardSize={boardSize}
            matchType={matchType}
            // プレイヤの色: 1
            playerColor={myColor}
            // 現在の盤面、インデックス、テリトリーボード: 3
            board={boardHistory[currentIndex] ?? {}}
            currentIndex={currentIndex}
            territoryBoard={territoryBoard}
            // history系: 3
            moveHistory={moves}
            boardHistory={boardHistory}
            agehamaHistory={agehamaHistory}
            // タッチした時の処理: 1
            onPutStone={handlePutStone}
            // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3
            disabled={!isMyTurn || isGameEnded}
            isGameEnded={isGameEnded}
            doubleTap={
              boardSize === 9
                ? doubleTap9
                : boardSize === 13
                  ? doubleTap13
                  : doubleTap19
            }
            // その他情報: 5
            forceShowTerritory={false} // ダミーだけどちゃんとfalse
            editMarkers={new Map<Grid, "human" | "bot">()} // ダミー
            candidatePoints={[]} // ダミー
            moveEvaluationPoint={0} // ダミー
            moveEvaluation={undefined} // ダミー
            // 物理サイズ: 1
            boardWidth={boardWidth}
            // 色: 10
            boardColor={COLORS.primary}
            lineColor={COLORS.background}
            blackStoneColor={COLORS.darkObject}
            blackStoneAccentColor={COLORS.darkObjectAccent}
            whiteStoneColor={COLORS.lightObject}
            whiteStoneAccentColor={COLORS.lightObjectAccent}
            humanMoveColor={COLORS.humanMoveColor}
            botMoveColor={COLORS.botMoveColor}
            goodMoveColor={COLORS.goodMoveColor}
            badMoveColor={COLORS.badMoveColor}
            // 音
            sound={isSoundEnabled}
            practiceMatchStatus={""} // 適当
          />

          {/* 自分情報 */}
          <View style={{ width: boardWidth }}>
            <PlayerCard
              username={username ?? ""}
              iconIndex={iconIndex ?? 0}
              rating={myRating}
              color={myColor}
              isLeft={false}
              showPass={myColor === BLACK ? isBlackPass : isWhitePass}
              agehamaCount={
                myColor === BLACK
                  ? agehamaHistory[currentIndex].black
                  : agehamaHistory[currentIndex].white
              }
              seconds={mySeconds}
              isMyTurn={turnState === myColor}
            />
          </View>
        </View>

        {/* ─── 余白 B ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_B }} />

        {/* ─── 二兄弟 ─── */}
        {!isGameEnded && (
          <View className="flex-row gap-2" style={{ width: boardWidth }}>
            <TouchableOpacity
              className={`flex-1 h-14 border-2 border-primaryDark rounded-2xl justify-center items-center bg-foreground ${
                !isMyTurn ? "opacity-50" : "opacity-100"
              }`}
              onPress={() => {
                handlePutStone(PASS_GRID);
              }}
              disabled={!isMyTurn}
              activeOpacity={0.7}
            >
              <Text className="text-lg font-semibold text-primaryDark">
                {t("common.pass")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 h-14 border-2 border-coral rounded-2xl justify-center items-center bg-foreground ${
                !isMyTurn ? "opacity-50" : "opacity-100"
              }`}
              onPress={handleResign}
              disabled={!isMyTurn}
              activeOpacity={0.7}
            >
              <Text className="text-lg font-semibold text-coral">
                {t("common.resign")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 余白 C ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_C }} />
      </View>

      <LoadingModal visible={loading} />
    </SafeAreaView>
  );
  // LoadingModalを無理にここから移動させようとすると、多分いろんなところにshow(<LoadingModal>とか
  // 書かなきゃいけなくなってむしろ冗長化しそうなので、外に出している。)
  // 複数の場所でshowが現れるようなページは、事情(タブコンポーネントとか。Profilescreenはまさにそうだ。というのは、showを使わないと、モーダルがタブ部分に負けてしまう)
  // がない限り、ここのように外に出すことを受け入れた方がいいかもしれない。
  // 2026/08/29追記:
  // showを使っているモーダルたちは、他の人にshowを使われると自動的にそれまで表示されていたモーダルは消える。
  // overlay providerが提供している「椅子=枠」は一つだけだからだ。
  // 逆に言えば、そのシステムに乗りたくない場合はshowを使わなければ良い。
}
