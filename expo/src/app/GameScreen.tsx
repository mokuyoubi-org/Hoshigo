// GameScreen.tsx

// 2026/08/29
// ロジックのことはuseMatchSessionが管理役を務める。
// UIのことはGameScreenが管理役を務める。
// ということで、useEffectでモーダルを表示したりする処理はこちらに書いてあります。
// stateを変更した、その場ではなく、こちらでstateの変更に気づいて発火するようになっています。
import { PlayerCard } from "@/src/components/cards/PlayerCard";
import { MyText } from "@/src/components/common/MyText";
import LoadingModal from "@/src/components/modals/common/LoadingModal";
// import { AutoPassModal } from "@/src/components/modals/game/AutoPassModal";
import { GameStartModal } from "@/src/components/modals/game/GameStartModal";
import { PassConfirmModal } from "@/src/components/modals/game/PassConfirmModal";
import { GameResultModal } from "@/src/components/modals/game/result/GameResultModal";
import { GameScreenSettingsModal } from "@/src/components/modals/game/settings/GameScreenSettingsModal";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors } from "@/src/hooks/common/useTheme";
import { useMatchSession } from "@/src/hooks/match/useMatchSession";
import { useTranslation } from "@/src/i18n/LangProvider";
import {
  GameScreenParams,
  getPassState,
  parseGameParams,
} from "@/src/logics/game/gameScreenLogics";
import { getRankInfo } from "@/src/logics/rank/rankLogics";
import { FontAwesome6 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GoBoard } from "go-components";
import { BLACK, Grid, PASS_GRID } from "go-core";
import { useEffect, useRef } from "react";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, MyHeader } from "ui-atoms";
import { buildRecordFromMatch } from "../logics/record/recordBuilder";

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
  const colors = useColors();
  const { show, hide } = useOverlay();

  // 碁盤サイズ
  const { height, width } = useWindowDimensions();
  const boardWidth = Math.min(
    width * BOARD_WIDTH_RATIO,
    height * BOARD_HEIGHT_RATIO,
  );
  // 対局する人の情報
  const { uid, iconIndex, username, stats } = useProfile();
  const [rank9, rank13, rank19] = [
    getRankInfo(stats[9].rating, t),
    getRankInfo(stats[13].rating, t),
    getRankInfo(stats[19].rating, t),
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
    (boardSize === 9
      ? stats[9].rating
      : boardSize === 13
        ? stats[13].rating
        : stats[19].rating) ?? 0;

  // 🌟useMatchSession呼び出し!
  const {
    boardHistory,
    agehamaHistory,
    moves,
    currentIndex,
    ownership,
    isMyTurn,
    mySeconds,
    oppSeconds,
    isGameEnded,
    resultComment,
    loading,
    handlePutStone,
    handleResign,
    shouldConfirmPass,
    isPassReady,
    turnState,
    ratingBefore,
    ratingAfter,
    rankIndexBefore,
    rankIndexAfter,
    resultRaw,
    analysis,
    doubleTap,
    isSoundEnabled,
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

  // 🌟 パスボタンを押せないか。自分の番じゃない時、または
  //   今の局面の判断(パスの確認が要るか)がまだ終わっていない時。
  const isPassDisabled = !isMyTurn || !isPassReady;
  const isPlayerBlack = myColor === BLACK;
  const blackWins = resultRaw?.startsWith("B")
    ? true
    : resultRaw?.startsWith("W")
      ? false
      : undefined;
  const playerWin = isPlayerBlack ? blackWins : !blackWins;

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
        matchType={matchType}
        moves={moves}
        visible={true}
        resultComment={resultComment}
        onClose={onClose}
        ratingBefore={ratingBefore}
        ratingAfter={ratingAfter}
        rankIndexBefore={rankIndexBefore}
        rankIndexAfter={rankIndexAfter}
        from={"GameScreen"}
        playerWin={playerWin}
      />,
    );
  };
  // 🌟最新のhandlePutStoneを指すref。確認モーダルの「はい」から呼ぶ時に、
  //   モーダルを出した時点の古い関数(古いisGameEndedなどを握っている)ではなく、
  //   常に最新の関数を使うため。
  const handlePutStoneRef = useRef(handlePutStone);
  useEffect(() => {
    handlePutStoneRef.current = handlePutStone;
  });

  // パスボタンを押した時の処理。
  // 終局していない局面でのパスは、確認のモーダルを出す。
  //   「はい」→ パスする / 「いいえ」→ 何もしない(手を打っていない状態のまま)
  // 終局している局面、または分析がまだ届いていなくて判定できない時は、
  // 確認なしでそのままパスする。
  const handlePassPress = () => {
    if (!shouldConfirmPass()) {
      handlePutStone(PASS_GRID);
      return;
    }
    show(
      <PassConfirmModal
        onYes={() => {
          hide();
          handlePutStoneRef.current(PASS_GRID);
        }}
        onNo={hide}
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

      // 🐱 棋譜は、アプリの中で組み立てて、パラメータで棋譜画面に渡す
      const record = buildRecordFromMatch({
        matchId,
        boardSize,
        matchType,
        moves: moves ?? [],
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

      router.replace({
        // 2026/10/05: ⚠️ここはreplaceでなければならない
        pathname: "/BoardEditScreen",
        params: {
          recordParam: JSON.stringify(record),
          from: "GameScreen",
          resultComment: resultComment,
          rankIndexBefore: rankIndexBefore,
          rankIndexAfter: rankIndexAfter,
          ratingBefore: ratingBefore,
          ratingAfter: ratingAfter,
          whiteRotation: isPlayerBlack ? "" : "whiteRotation",
        },
      });

      showResultModal();
    }
  }, [isGameEnded]);

  // ---------- UI ----------
  // 🛡️ガード
  if (!matchId) return null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-160 mx-auto px-4 pt-2">
        {/* ─── ヘッダー ─── */}
        <MyHeader
          left={
            <IconButton
              icon={<FontAwesome6 name="info" />}
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundStrong}
              onPress={showGameStartModal}
            />
          }
          right={
            <IconButton
              icon={<FontAwesome6 name={"gear"} />}
              iconColor={colors.primary}
              backgroundColor={colors.foreground}
              borderColor={colors.backgroundStrong}
              onPress={() => {
                show(
                  <GameScreenSettingsModal
                    onClose={hide}
                    boardSize={boardSize}
                  />,
                );
              }}
            />
          }
        />

        {/* ─── 余白 A ─── */}
        <View style={{ flexGrow: LAYOUT_CONFIG.FLEX_A }} />

        {/* ─── 三兄弟 ─── */}
        <View
          className="items-center gap-2 self-center" // self-center大事
        >
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
          {/* 白番のときは、向かい合って打つ感じを出すために180度回転させる */}
          <View
            style={
              isPlayerBlack ? undefined : { transform: [{ rotate: "180deg" }] }
            }
          >
            <GoBoard
              // 盤面サイズ: 1
              boardSize={boardSize}
              matchType={matchType}
              // プレイヤの色: 1
              playerColor={myColor}
              // 現在の盤面、インデックス、テリトリーボード: 3
              board={boardHistory[currentIndex] ?? {}}
              currentIndex={currentIndex}
              ownership={ownership}
              // history系: 3
              moveHistory={moves}
              boardHistory={boardHistory}
              agehamaHistory={agehamaHistory}
              // タッチした時の処理: 1
              onPutStone={handlePutStone}
              // 触れるか否か、ダブルタップの可否、終局しているかどうか: 3
              disabled={!isMyTurn || isGameEnded}
              isGameEnded={isGameEnded}
              doubleTap={doubleTap}
              // その他情報: 5
              forceShowTerritory={false} // ダミーだけどちゃんとfalse
              editMarkers={new Map<Grid, "human" | "bot">()} // ダミー
              candidatePoints={[]} // ダミー
              moveEvaluationPoint={0} // ダミー
              moveEvaluation={undefined} // ダミー
              // 物理サイズ: 1
              boardWidth={boardWidth}
              // 色: 10
              boardColor={colors.primary}
              lineColor={colors.background}
              blackStoneColor={colors.blackStone}
              whiteStoneColor={colors.whiteStone}
              humanMoveColor={colors.humanMoveColor}
              botMoveColor={colors.botMoveColor}
              goodMoveColor={colors.success}
              badMoveColor={colors.failure}
              // 音
              sound={isSoundEnabled}
              practiceMatchStatus={""} // 適当
            />
          </View>

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
          <View
            className="flex-row gap-2 self-center" // self-center大事
            style={{ width: boardWidth }}
          >
            {/* パスボタン */}
            <TouchableOpacity
              className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
                isPassDisabled
                  ? "border-backgroundStrong"
                  : "border-primaryStrong"
              }`}
              onPress={handlePassPress}
              disabled={isPassDisabled}
              activeOpacity={0.7}
            >
              <MyText
                className={"text-lg"}
                style={{
                  color: isPassDisabled
                    ? colors.backgroundStrong
                    : colors.primaryStrong,
                }}
              >
                {t("common.pass")}
              </MyText>
            </TouchableOpacity>
            {/* 投了ボタン */}
            <TouchableOpacity
              className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
                isPassDisabled ? "border-failureLight" : "border-failure" // 元は!isMyTurn。だがUI的にパスに合わせる
              }`}
              onPress={handleResign}
              disabled={isPassDisabled} // 元は!isMyTurn。だがUI的にパスに合わせる
              activeOpacity={0.7}
            >
              <MyText
                className={"text-lg"}
                style={{
                  color: isPassDisabled ? colors.failureLight : colors.failure, // 元は!isMyTurn。だがUI的にパスに合わせる
                }}
              >
                {t("common.resign")}
              </MyText>
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
