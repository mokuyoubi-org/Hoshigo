// useMatchSession.ts
// 対局のUIの責任者がGameScreen
// 対局のロジックの責任者がuseMatchSession

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useBotMove } from "@/src/active/hooks//bot/useBotMove";
import { useKataGoTask } from "@/src/active/hooks//bot/useKataGoTask";
import { useBotCalculation } from "@/src/active/hooks/bot/useBotCalculation";
import { useGameChannel } from "@/src/active/hooks/match/useGameChannel";
import { useLiveAnalysis } from "@/src/active/hooks/match/useLiveAnalysis";
import { useMatchClock } from "@/src/active/hooks/match/useMatchClock";
import { useTranslation } from "@/src/active/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import {
  computeMatchResultUpdate,
  MatchResultUpdate,
} from "@/src/stable/logics/resultLogics";
import { resultToComment } from "@/src/stable/logics/textFormatter";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { ModelId } from "expo-katago";
import { useGoGame } from "go-components";
import {
  BoardSize,
  Color,
  Grid,
  MatchType,
  PASS_GRID,
  RecordAnalysis,
} from "go-core";
import { useCallback, useEffect, useRef, useState } from "react";

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

export function useMatchSession({
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
}: Args) {
  // =========================================================================================
  // 🌟 ===================================== state =====================================
  // =========================================================================================
  const kataGoTask = useKataGoTask();
  const t = useTranslation();
  const goBoard = useGoGame({ boardSize, matchType, movesInt });
  const { boardRef, movesRef } = goBoard;
  const botMove = useBotMove(myColor, boardSize, oppUsername);
  const endgame = useBotCalculation();
  const liveAnalysis = useLiveAnalysis();
  const { rating9, rating13, acquiredIcons, updateProfile } = useProfile();
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [resultComment, setResultComment] = useState("");
  const [loading, setLoading] = useState(false);
  // 🐱 対局終了直後、RecordType組み立てに必要だけど今まで捨てていたデータたち
  const [resultRaw, setResultRaw] = useState<string | null>(null);
  const [oppRatingAfter, setOppRatingAfter] = useState(0);
  const [finalDeadStones, setFinalDeadStones] = useState<number[]>([]);
  // 🐱 対局終了時にそのままrecordへ乗せる、裏で溜め続けた分析結果
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<RecordAnalysis>({
    perMove: [],
  });
  const [matchResult, setMatchResult] = useState<
    Omit<MatchResultUpdate, "profilePatch">
  >(() => {
    const initialRating = (boardSize === 9 ? rating9 : rating13) ?? 0;
    return {
      ratingBefore: initialRating,
      rankIndexBefore: getRankInfo(initialRating, t).index,
      ratingAfter: 0,
      rankIndexAfter: 0,
      newlyAcquiredIcons: [],
    };
  });
  const isResyncingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isBotThinkingRef = useRef(false);
  // 相手が使っているモデルに合わせて分析する。人間戦で使われるのはb6。
  const modelId: ModelId =
    oppUsername === "bot1"
      ? "b6"
      : oppUsername === "bot2"
        ? "b10"
        : oppUsername === "bot3"
          ? "b18"
          : "b6";
  const analysisRequestIdRef = useRef(0);

  // =========================================================================================
  // 🌟 ===================================== 関数 =====================================
  // =========================================================================================

  // 通信トラブルで相手の手を受けとり損ねたときに、自動で最新の状態に追いつかせる処理
  const handleServerSync = async (moves: Grid[]) => {
    // 🛡️ガード
    if (isGameEnded) return;

    const localCount = goBoard.movesRef.current.length;
    const serverCount = moves.length;
    console.log("localCount: ", localCount);
    console.log("serverCount: ", serverCount);
    console.log("moves: ", moves);

    if (serverCount > localCount && !isResyncingRef.current) {
      isResyncingRef.current = true;
      console.warn(
        `[useMatchSession] moves取りこぼし検出: local=${localCount} → server=${serverCount}、resyncします`,
      );

      reconnect();

      const serverTurn = goBoard.loadMoves(moves);
      liveAnalysis.truncate(moves.length); // 🐱 moves差し替えに合わせて分析データも整合させる
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
  const handleRunBotTurn = useCallback(async () => {
    // 🐱 botの手がこの後何手目として記録されるか。add_move呼び出し前(まだ
    //    ローカルに反映されていない)時点のmovesRef長がそのままインデックス。
    const botMoveIndex = movesRef.current.length;

    await botMove.runBotTurn(
      boardRef.current,
      movesRef.current,
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

        liveAnalysis.record(botMoveIndex, analysis);
        // ボットの着手成功時にハートビートタイマーをリセット
        clock.resetHeartbeat();
      },
    );
  }, [botMove, matchType, matchId, clock, liveAnalysis, boardRef, movesRef]);

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
      const isDoublePass =
        grid === PASS_GRID && moves[moves.length - 2] === PASS_GRID;

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

  // =========================================================================================
  // 🌟 ===================================== チャンネル系 =====================================
  // =========================================================================================

  // gameチャンネルからmoveイベントが来た時に行われる処理
  const gameCh_move = async (payload: any) => {
    if (isGameEnded) return;
    const data = payload.payload ?? payload;
    const move: number = data.move;
    const moveCount: number = data.move_count;

    clock.syncSecondsFromServer(
      Number(data.black_seconds),
      Number(data.white_seconds),
    );

    const isNewMove = moveCount === goBoard.movesRef.current.length + 1;

    if (isNewMove) {
      goBoard.applyTrustedMove(move, oppColor);
      isSubmittingRef.current = false;

      // 相手の手を受信(相手のadd_move)したタイミングでハートビートタイマーをリセット
      clock.resetHeartbeat();

      // 🐱 この手を受けて自分の番になった局面の分析は、盤面変化監視用の
      //    useEffectが自動的に発火して記録してくれるので、ここでは呼ばない。

      const moves = goBoard.movesRef.current;
      const isDoublePass =
        move === PASS_GRID && moves[moves.length - 2] === PASS_GRID;

      if (isDoublePass) {
        clock.freeze(); // 🥶 集計待ちの間、誰の番でもない
      } else {
        clock.unfreeze(myColor);
      }
    }
  };

  // gameチャンネルからdouble_passイベントが来た時に行われる処理
  const gameCh_double_pass = async (payload: any) => {
    if (isGameEnded) return;
    setLoading(true);

    try {
      const { deadStones, analysis } = await endgame.analyzeTerritory(
        goBoard.boardRef.current,
        goBoard.movesRef.current,
        matchType,
        boardSize,
      );
      goBoard.setDeadStones(deadStones);
      setFinalDeadStones(deadStones);

      // 🐱 これが「最後の1手を打った後の局面」の解析結果そのものなので、
      //    perMove[totalMoves]として記録する。これで最後の1手も評価できる。
      liveAnalysis.record(goBoard.movesRef.current.length, analysis);

      const { result } = goBoard.computeTerritory();

      const { data, error } = await supabase.rpc("submit_match_result", {
        p_match_id: matchId,
        p_result: result,
        p_dead_stones: deadStones,
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
  const gameCh_rating_updated = (payload: any) => {
    const data = payload.payload ?? payload;
    if (!data) return;

    const myData = myColor === 1 ? data.black : data.white;
    const oppData = myColor === 1 ? data.white : data.black;

    if (myData) {
      const updated = computeMatchResultUpdate(
        boardSize,
        myData,
        rating9 ?? 0,
        rating13 ?? 0,
        acquiredIcons ?? [],
        t,
      );
      if (updated) {
        const { profilePatch, ...displayResult } = updated;
        setMatchResult(displayResult);
        updateProfile(profilePatch);
      }
    }

    if (oppData?.new_rating != null) {
      setOppRatingAfter(oppData.new_rating);
    }

    if (data.result) {
      const resTmp = goBoard.computeTerritory();
      goBoard.setTerritoryBoard(resTmp.territoryBoard);

      setResultRaw(data.result);
      setResultComment(
        resultToComment(data.result, myColor, t) ?? t("common.matchComplete"),
      );

      // 🐱 裏で溜め続けた分析結果を、この時点で確定させてstateに移す。
      setLiveAnalysisResult(liveAnalysis.getRecordAnalysis());

      console.log("🏁 対局中の全処理が終了！");
      setIsGameEnded(true);
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
  // 🌟ボットの番になったら自動的にボットに打たせるトリガー。
  useEffect(() => {
    const isBotTurn = clock.turnState === oppColor;

    // 🛡️ガード
    if (!botMatch || !isBotTurn || isGameEnded || isBotThinkingRef.current)
      return;

    const execute = async () => {
      isBotThinkingRef.current = true;
      try {
        await handleRunBotTurn();
      } catch (e) {
        console.error("ボットの着手実行エラー:", e);
      } finally {
        isBotThinkingRef.current = false;
      }
    };
    execute();
  }, [botMatch, clock.turnState, handleRunBotTurn, oppColor, isGameEnded]);

  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  // 🌟ボットの番じゃない時は自動で分析を開始するトリガー。
  useEffect(() => {
    const isBotTurn = botMatch && clock.turnState === oppColor;
    const currentPlayer = clock.turnState;

    // 🛡️ガード
    if (
      isGameEnded ||
      isBotTurn ||
      currentPlayer === "frozen" ||
      !currentPlayer
    )
      return;

    const moves = goBoard.moves;
    const nextMoveIndex = moves.length;

    // ダブルパス(終局)後は「次の一手」が存在しないので対象外。
    // 最終局面の分析はgameCh_double_pass側のanalyzeTerritoryに任せる。
    const isDoublePass =
      moves.length >= 2 &&
      moves[moves.length - 1] === PASS_GRID &&
      moves[moves.length - 2] === PASS_GRID;
    if (isDoublePass) return;

    const board = goBoard.boardHistoryRef.current[nextMoveIndex];
    if (!board) return;

    const requestId = ++analysisRequestIdRef.current;

    (async () => {
      const analysis = await kataGoTask.run({
        board,
        movesSoFar: moves,
        matchType,
        boardSize,
        modelId: modelId,
        currentPlayer,
      });

      // 🥶 発火後に盤面がさらに変わっていたら(取り消し→打ち直し等)、
      //    この結果は古いので捨てる。
      if (analysisRequestIdRef.current !== requestId) return;

      liveAnalysis.record(nextMoveIndex, analysis);
    })();
  }, [
    goBoard.moves,
    goBoard.boardHistoryRef,
    isGameEnded,
    botMatch,
    clock.turnState,
    oppColor,
    matchType,
    boardSize,
    modelId,
    kataGoTask,
    liveAnalysis,
  ]);

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
    setCurrentIndex: goBoard.setCurrentIndex,
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
    oppRatingAfter,
    finalDeadStones,
    analysis: liveAnalysisResult,
    ...matchResult,
  };
}
