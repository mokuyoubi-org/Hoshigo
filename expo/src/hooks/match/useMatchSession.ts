// useMatchSession.ts
// 対局のUIの責任者がGameScreen
// 対局のロジックの責任者がuseMatchSession

import { BotUsername } from "@/src/constants/botProfiles";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useBotMove } from "@/src/hooks/ai/useBotMove";
import { useFinalPositionAnalysis } from "@/src/hooks/ai/useFinalPositionAnalysis";
import { useLiveAnalysis } from "@/src/hooks/ai/useLiveAnalysis";
import { useGameChannel } from "@/src/hooks/match/useGameChannel";
import { useMatchClock } from "@/src/hooks/match/useMatchClock";
import { useTranslation } from "@/src/i18n/LangProvider";
import { resultToSubjectiveComment } from "@/src/logics/format/textFormatter";
import { endsWithDoublePass } from "@/src/logics/game/endsWithDoublePass";
import {
  computeMatchResultUpdate,
  MatchResultUpdate,
} from "@/src/logics/game/resultLogics";
import { getRankInfo } from "@/src/logics/rank/rankLogics";
import { supabase } from "@/src/services/supabase/supabase";
import { useGoGame } from "go-components";
import {
  BLACK,
  BoardSize,
  Color,
  getFinalResult,
  getOppositeColor,
  Grid,
  MatchType,
  RecordAnalysis,
  TerritoryBoard,
  WHITE,
} from "go-core";
import { useKVStorage } from "kv-store";
import { useEffect, useRef, useState } from "react";

type Args = {
  matchId: number;
  myColor: Color;
  oppColor: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  movesInt: number[];
  botMatch: boolean;
  oppUsername?: string;
  initialMySeconds: number;
  initialOppSeconds: number;
};

export const useMatchSession = ({
  matchId,
  myColor,
  oppColor,
  boardSize,
  matchType,
  movesInt,
  botMatch,
  oppUsername,
  initialMySeconds,
  initialOppSeconds,
}: Args) => {
  // 🌟 サーバのturnカラムはtext('black'/'white')、アプリ内のColorは数値。
  //    realtimeのpayloadを受け取るたびにここで変換する。
  const stringToColor = (turn: "black" | "white"): Color =>
    turn === "black" ? BLACK : WHITE;

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

  const doubleTap =
    boardSize === 9
      ? doubleTap9
      : boardSize === 13
        ? doubleTap13
        : boardSize === 19
          ? doubleTap19
          : false;
  // =========================================================================================
  // 🌟 ===================================== state =====================================
  // =========================================================================================
  const t = useTranslation();
  const goBoard = useGoGame({ boardSize, matchType, movesInt });
  const { boardRef, movesRef } = goBoard;
  const botMove = useBotMove(
    getOppositeColor(myColor),
    boardSize,
    oppUsername as BotUsername,
  );
  const endgame = useFinalPositionAnalysis();
  const liveAnalysis = useLiveAnalysis({ matchType, boardSize });
  const { rating9, rating13, rating19, updateProfile } = useProfile();
  const [isGameEnded, setIsGameEnded] = useState(false);
  const isGameEndedRef = useRef(false);
  const [resultComment, setResultComment] = useState("");
  const [loading, setLoading] = useState(false);
  // 🐱 対局終了直後、RecordType組み立てに必要だけど今まで捨てていたデータたち
  const [resultRaw, setResultRaw] = useState<string | null>(null);
  // 🐱 対局終了時にそのままrecordへ乗せる、裏で溜め続けた分析結果
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<RecordAnalysis>({
    perMove: [],
  });
  const [matchResult, setMatchResult] = useState<
    Omit<MatchResultUpdate, "profilePatch">
  >(() => {
    const initialRating =
      (boardSize === 9 ? rating9 : boardSize === 13 ? rating13 : rating19) ?? 0;
    return {
      ratingBefore: initialRating,
      rankIndexBefore: getRankInfo(initialRating, t).index,
      ratingAfter: 0,
      rankIndexAfter: 0,
      giantKillingBonus: false,
    };
  });
  // 🐱 ジャイアントキリングの連勝数とボーナス。画面に出す値なので、refではなくstateで持つ。
  const [giantKilling, setGiantKilling] = useState<{
    streak: number;
    bonus: boolean;
  }>({ streak: 0, bonus: false });
  const isResyncingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isBotThinkingRef = useRef(false);
  // 🌟終局の地の盤面。ダブルパス処理で、仕上げ済みのエントリから作っておく。
  //   サーバーが結果を確定した時(rating_updated)に、盤面へ表示する。
  const finalTerritoryBoardRef = useRef<TerritoryBoard | null>(null);

  // =========================================================================================
  // 🌟 ===================================== 関数 =====================================
  // =========================================================================================

  // 通信トラブルで相手の手を受けとり損ねたときに、自動で最新の状態に追いつかせる処理
  const handleServerSync = async (moves: Grid[]) => {
    // 🛡️ガード
    if (isGameEnded) return;

    const localCount = goBoard.movesRef.current.length;
    const serverCount = moves.length;
    console.log("[handleServerSync] localCount: ", localCount);
    console.log("[handleServerSync] serverCount: ", serverCount);
    console.log("[handleServerSync] moves: ", moves);

    if (serverCount > localCount && !isResyncingRef.current) {
      isResyncingRef.current = true;
      console.warn(
        `[handleServerSync] moves取りこぼし検出: local=${localCount} → server=${serverCount}、resyncします`,
      );

      reconnect();

      const serverTurn = goBoard.loadMoves(moves);
      // 🐱 moves差し替えに合わせて分析データも整合させる。
      //    「直近の局面の付箋」も、どの局面のものか保証できなくなるので、
      //    truncateの中で一緒に破棄される(誤って使い回さないため)。
      liveAnalysis.truncate(moves.length);
      clock.unfreeze(serverTurn);
      isResyncingRef.current = false;
    }
  };

  // =========================================================================================
  // 🌟 ===================================== 時計の用意 =====================================
  // =========================================================================================
  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  const clock = useMatchClock({
    matchId,
    myColor,
    initialTurn: goBoard.initialTurn,
    initialMySeconds,
    initialOppSeconds,
    isGameEnded,
    handleServerSync,
  });

  // =========================================================================================
  // 🌟 ===================================== 着手系処理 =====================================
  // =========================================================================================
  // 🌟ボットのターンになったら、useEffectによって自動的に行われる処理。
  const handleRunBotTurn = async () => {
    // 🐱 botの手がこの後何手目として記録されるか。add_move呼び出し前(まだ
    //    ローカルに反映されていない)時点のmovesRef長がそのままインデックス。
    const botMoveIndex = movesRef.current.length;
    // 🐱 分析した局面までの手の並び。手の配列は更新のたびに新しく作り直される
    //    ので、ここで握っておけば、あとから変わっても影響されない。
    const movesSoFar = movesRef.current;

    await botMove.runBotTurn(
      boardRef.current,
      movesSoFar,
      matchType,
      async (grid: Grid, analysis) => {
        // 💡ここでrunBotTurnのanalysisつまりresultを受け取っている
        // 🐱 着手決定のついでに手に入った分析結果は、まだ記録しない。
        //    supabaseへの送信が成功して初めて「この手は本当に打たれた」と
        //    確定するので、記録もそのタイミングまで待つ。
        const { error } = await supabase.rpc("add_move", {
          p_match_id: matchId,
          p_move: grid,
          p_is_bot: true,
        });

        if (error) {
          console.error("ボットの着手送信失敗:", error);
          return;
        }

        // 🌟recordは「直近の局面の付箋」の更新も兼ねる。このgridがpassで、
        //   かつこれがダブルパス成立の手だった場合、gameCh_double_pass側で
        //   再推論せずこの付箋を使い回す。
        liveAnalysis.record(botMoveIndex, analysis, movesSoFar);
        // ボットの着手成功時にハートビートタイマーをリセット
        clock.resetHeartbeat();
      },
    );
  };

  // 🌟人間が手を打った時の処理
  const handlePutStone = async (grid: Grid) => {
    if (!clock.isMyTurn || isGameEnded || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    clock.freeze(); // 🥶 タップした瞬間から結果が確定するまで、誰の番でもない

    // 手を打つ。非合法手ならfalseが返ってくる
    const applied = goBoard.applyLegalMove(grid, myColor);
    if (!applied) {
      clock.unfreeze(myColor); // 非合法手なら即座に自分の番へ戻す
      isSubmittingRef.current = false;
      return;
    }

    // 🥶 RPC送信をtry/catch/finallyで保護する。失敗・例外どちらでも
    // 必ず「石を戻す→自分の番に戻す→送信フラグを解放する」という
    // 後始末に辿り着けるようにするための一本化。
    // 🐱 この手の分析(perMove記録)は、この局面になった瞬間に盤面変化
    //    監視用のuseEffectが既に済ませているので、ここでは計算しない。
    try {
      // supabase送信
      const { error } = await supabase.rpc("add_move", {
        p_match_id: matchId,
        p_move: grid,
      });

      // 失敗した場合、なかったことにしてまたやり直し
      if (error) {
        console.error("着手送信失敗:", error);
        goBoard.loadMoves(goBoard.movesRef.current.slice(0, -1));
        clock.unfreeze(myColor); // 失敗したら自分の番へ戻す
        return;
      }

      // 着手送信成功時にハートビートタイマーをリセット
      clock.resetHeartbeat();

      // 🥶 自分の手がダブルパスだった場合、そのままfrozenを維持
      const moves = goBoard.movesRef.current;
      const isDoublePass = endsWithDoublePass(moves);
      if (!isDoublePass) {
        clock.unfreeze(oppColor);
      }
    } catch (e) {
      // RPC通信の例外をここで拾う
      console.error("着手処理で例外発生:", e);
      goBoard.loadMoves(goBoard.movesRef.current.slice(0, -1));
      clock.unfreeze(myColor); // 例外でも自分の番へ戻す
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // 🌟人間が投了した時の処理
  const handleResign = async () => {
    if (!clock.isMyTurn || isGameEnded) return;

    clock.freeze(); // 🥶 投了確定までボットの自動着手・自分のタップを止める

    // 🐱 「今、自分の番である」ということは、この局面(=投了する直前の
    //    局面)の分析は、盤面変化監視用のuseEffectが自分の番になった
    //    瞬間に既に計算・記録済みのはず。ここで改めて計算する必要はない。

    try {
      const { error } = await supabase.rpc("resign", {
        p_match_id: matchId,
      });

      if (error) {
        console.error("投了送信失敗:", error);
        clock.unfreeze(myColor); // 失敗したら自分の番に戻す
      }
    } catch (e) {
      console.error("投了送信で例外発生:", e);
      clock.unfreeze(myColor); // 例外でも自分の番に戻す
    }
  };

  // 🌟パスを打つ前に、確認のモーダルを出すべきか。
  //   今の局面が、分析のownershipから「未終局」と判定された時だけtrue。
  //   分析がまだ届いていない/取れなかった時は、判定できないのでfalse
  //   (=確認なしでパスできる。操作をじゃましない)。
  const shouldConfirmPass = (): boolean =>
    liveAnalysis.isPositionUnfinished(
      goBoard.boardRef.current,
      goBoard.movesRef.current,
    ) === true;

  // =========================================================================================
  // 🌟 ===================================== チャンネル系 =====================================
  // =========================================================================================

  // gameチャンネルからmoveイベントが来た時に行われる処理
  const gameCh_move = async (payload: any) => {
    if (isGameEnded) return;
    const data = payload.payload ?? payload;
    const move: number = data.move;
    const moveCount: number = data.move_count;
    // 🌟サーバが教えてくれる「この手の後、誰の番か」を絶対の正とする。
    //   複数端末で同じアカウントを開いていても、これさえ信じれば
    //   「今受け取った手は誰の手か」「次は誰の番か」を自分視点の
    //   思い込み(常に相手の手のはず)なしに正しく判定できる。
    //   data.turnはDB由来の文字列('black'/'white')なので、
    //   アプリ内部の数値Colorに変換してから使う。
    const nextTurn: Color = stringToColor(data.turn);
    const moverColor: Color = getOppositeColor(nextTurn);

    clock.syncSecondsFromServer(
      Number(data.black_seconds),
      Number(data.white_seconds),
    );

    const isNewMove = moveCount === goBoard.movesRef.current.length + 1;

    if (isNewMove) {
      goBoard.applyTrustedMove(move, moverColor);
      isSubmittingRef.current = false;

      // 相手の手を受信(相手のadd_move)したタイミングでハートビートタイマーをリセット
      clock.resetHeartbeat();

      // 🐱 この手を受けて自分の番になった局面の分析は、盤面変化監視用の
      //    useEffectが自動的に発火して記録してくれるので、ここでは呼ばない。

      const moves = goBoard.movesRef.current;
      const isDoublePass = endsWithDoublePass(moves);

      if (isDoublePass) {
        clock.freeze(); // 🥶 集計待ちの間、誰の番でもない
      } else {
        // 🌟myColor決め打ちではなく、サーバが返した次の手番をそのまま採用する。
        clock.unfreeze(nextTurn);
      }
    }
  };

  // gameチャンネルからdouble_passイベントが来た時に行われる処理
  const gameCh_double_pass = async (payload: any) => {
    if (isGameEnded) return;
    setLoading(true);

    try {
      // 🌟直前の付箋が、ちょうど「このダブルパス直前の局面」を指して
      //   いれば(=間に取りこぼしや余計な手が挟まっていなければ)、
      //   パスは盤面を変えないので、使い回し候補として渡す。
      //   ズレていればundefinedになり、新規に推論される。
      const precomputedAnalysis = liveAnalysis.getCachedAnalysis(
        goBoard.movesRef.current.length - 1,
      );

      const analysis = await endgame.analyzeFinalPosition(
        goBoard.boardRef.current,
        goBoard.movesRef.current,
        matchType,
        boardSize,
        precomputedAnalysis,
      );

      // 🐱 これが「最後の1手を打った後の局面」の解析結果そのものなので、
      //    perMove[totalMoves]として記録する。これで最後の1手も評価できる。
      //    手の並びは連続パスで終わっているので、ここで確定した局面として
      //    仕上げられ、仕上げ済みのエントリが返ってくる。
      const entry = liveAnalysis.record(
        goBoard.movesRef.current.length,
        analysis,
        goBoard.movesRef.current,
      );

      // 🌟結果の文字列と地の盤面は、仕上げ済みのエントリから作る。
      const { result, territoryBoard } = getFinalResult(
        boardSize,
        matchType,
        goBoard.movesRef.current,
        entry,
      );
      finalTerritoryBoardRef.current = territoryBoard;

      // 🌟死に石(p_dead_stones)はもう送らない。サーバー側は引数の既定値('{}')で動く。
      const { data, error } = await supabase.rpc("submit_match_result", {
        p_match_id: matchId,
        p_result: result,
      });

      if (error) {
        console.error("result提出失敗:", error);
        setLoading(false); // 🥶 失敗時は「読み込み中」表示のまま固まらないよう解除
        return;
      }

      if (data) console.log("result提出成功:", data);
      // 🥶 成功時はここでloadingを解除しない。実際の終局処理は
      // gameCh_rating_updated の data.result 受信時に setLoading(false) される想定のため。
    } catch (e) {
      console.error("ダブルパス処理で例外発生:", e);
      setLoading(false); // 🥶 例外時も同様に固まらないよう解除
    }
  };

  // gameチャンネルからrating_updatedイベントが来た時に行われる処理
  const gameCh_rating_updated = async (payload: any) => {
    const data = payload.payload ?? payload;
    if (!data) return;

    const myData = myColor === BLACK ? data.black : data.white;

    // myDataが無くても、終局処理(下のdata.result)は続ける
    if (myData) {
      if (boardSize === 9) updateProfile({ wins9: myData.wins });
      else if (boardSize === 13) updateProfile({ wins13: myData.wins });
      else if (boardSize === 19) updateProfile({ wins19: myData.wins });

      setGiantKilling({
        streak: myData.giant_killing_streak,
        bonus: myData.giant_killing_bonus ?? false,
      });

      const updated = computeMatchResultUpdate(boardSize, myData, t);
      if (updated) {
        const { profilePatch, ...displayResult } = updated;
        setMatchResult(displayResult);
        updateProfile(profilePatch);
      }
    }
    // 2026/09/23
    if (data.result) {
      // 🐱 終局の地の盤面は、ダブルパス処理で仕上げ済みのエントリから作ってある。
      //    (投了など、ダブルパス処理を通っていない終局では、地は出さない)
      if (finalTerritoryBoardRef.current) {
        goBoard.setTerritoryBoard(finalTerritoryBoardRef.current);
      }

      setResultRaw(data.result);
      setResultComment(
        resultToSubjectiveComment(data.result, myColor, t) ??
          t("common.matchComplete"),
      );

      // 🐱 裏で溜め続けた分析結果を、この時点で確定させてstateに移す。
      //    浮いてる背景分析(投了時は特に、間に合ってない可能性がある)が
      //    あれば、それが終わるまで待ってからスナップショットを取る。
      await liveAnalysis.waitForPending();
      setLiveAnalysisResult(liveAnalysis.getRecordAnalysis());

      console.log("🏁 対局中の全処理が終了！");
      setIsGameEnded(true);
      isGameEndedRef.current = true;
      clock.destroyAllClocks();
      setLoading(false);
    }
  };

  // 🌟🌟🌟ここでチャンネルに登録し、そして万が一の時のreconnect関数も受け取っている。
  // ここでuseGameChannelを呼ぶと、useGameChannelはチャンネル名とかイベント名を用意して内部でuseRealtimeChannelを呼ぶ。
  // そしてuseRealtimeChannelが実際にsupabaseとリアルタイム通信する。
  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  const { reconnect } = useGameChannel(
    matchId,
    {
      onMove: gameCh_move,
      onDoublePass: gameCh_double_pass,
      onRatingUpdated: gameCh_rating_updated,
    },
    !isGameEnded,
  );

  // =========================================================================================
  // 🌟 ===================================== トリガー =====================================
  // =========================================================================================
  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  // 🌟ボットの番になったら自動的にボットに打たせるトリガー(3秒おきの確認付き)
  useEffect(() => {
    const isBotTurn = clock.turnState === oppColor;

    const execute = async () => {
      // 🛡️ガード
      if (
        !botMatch ||
        !isBotTurn ||
        isGameEndedRef.current ||
        isBotThinkingRef.current
      )
        return;
      console.log("ボットのターンだ！発火🔥");

      isBotThinkingRef.current = true;
      try {
        await handleRunBotTurn();
      } catch (e) {
        console.error("ボットの着手実行エラー:", e);
      } finally {
        isBotThinkingRef.current = false;
      }
    };

    // 1. ターンの切り替わり時にすぐ実行する
    execute();

    // 2. 3秒ごとに定期実行するタイマーを仕込む
    const intervalId = setInterval(() => {
      execute();
    }, 3000);

    // 3. クリーンアップ処理
    return () => {
      clearInterval(intervalId);
    };
  }, [clock.turnState]);

  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  // 🌟ボットの番じゃない時は自動で分析を開始するトリガー。
  useEffect(() => {
    const isBotTurn = botMatch && clock.turnState === oppColor;
    const currentPlayer = clock.turnState;

    // 🛡️ガード
    if (
      isGameEndedRef.current ||
      isBotTurn ||
      currentPlayer === "frozen" ||
      !currentPlayer
    )
      return;
    console.log("自分のターンだ！分析発火🔥");

    const moves = goBoard.moves;
    const nextMoveIndex = moves.length;

    // ダブルパス(終局)後は「次の一手」が存在しないので対象外。
    // 最終局面の分析はgameCh_double_pass側のanalyzeTerritoryに任せる。
    if (endsWithDoublePass(moves)) return;

    const board = goBoard.boardHistoryRef.current[nextMoveIndex];
    if (!board) return;

    // 2026/09/23
    // 投げっぱなしでよい(記録・付箋の更新・件数管理は中でやってくれる)。
    liveAnalysis.analyzeAndRecord({
      moveIndex: nextMoveIndex,
      board,
      movesSoFar: moves,
    });
  }, [clock.turnState]);

  // =========================================================================================
  // 🌟 ===================================== return =====================================
  // =========================================================================================
  return {
    boardHistory: goBoard.boardHistory,
    boardHistoryRef: goBoard.boardHistoryRef,
    agehamaHistory: goBoard.agehamaHistory,
    moves: goBoard.moves,
    movesRef: goBoard.movesRef,
    currentIndex: goBoard.currentIndex,
    territoryBoard: goBoard.territoryBoard,
    goToLatest: goBoard.goToLatest,
    // 時間・手番
    isMyTurn: clock.isMyTurn,
    turnState: clock.turnState,
    mySeconds: clock.mySeconds,
    oppSeconds: clock.oppSeconds,
    isGameEnded,
    resultComment,
    loading,
    setLoading,
    handlePutStone,
    handleResign,
    resultRaw,
    analysis: liveAnalysisResult,
    ...matchResult,
    giantKillingStreak: giantKilling.streak,
    giantKillingBonus: giantKilling.bonus,
    doubleTap,
    isSoundEnabled,
    shouldConfirmPass,
  };
};
