// useMatchSession.ts
// 対局のUIの責任者がGameScreenなら、useMatchSessionは対局のロジックの責任者。

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import {
  computeMatchResultUpdate,
  MatchResultUpdate,
} from "@/src/stable/logics/resultLogics";
import { resultToComment } from "@/src/stable/logics/textFormatter";
import { supabase } from "@/src/stable/services/supabase/supabase";
import {
  BoardSize,
  Color,
  Grid,
  MatchType,
  PASS_GRID,
  useGoGame,
} from "expo-goband";
import { useCallback, useEffect, useRef, useState } from "react";

import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { RecordAnalysis } from "expo-goband";
import { useTranslation } from "../../language/i18n";
import { useBotCalculation } from "../bot/useBotCalculation";
import { useBotMove } from "../bot/useBotMove";
import { useKataGoTask } from "../bot/useKataGoTask";
import { useGameChannel } from "./useGameChannel";
import { useLiveAnalysis } from "./useLiveAnalysis";
import { ServerSyncPayload, useMatchClock } from "./useMatchClock";

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
  const kataGoTask = useKataGoTask();
  // -------- state --------
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

  // 相手が使っているモデルに合わせて分析する。人間相手ならb18。
  const opponentModelId: "b6" | "b10" | "b18" =
    oppUsername === "bot1" ? "b6" : oppUsername === "bot2" ? "b10" : "b18";

  // 🌟 -------- 関数 --------

  const handleServerSync = async (payload: ServerSyncPayload) => {
    if (isGameEnded) return;

    const localCount = goBoard.movesRef.current.length;
    const serverCount = payload.moves.length;

    if (serverCount > localCount && !isResyncingRef.current) {
      isResyncingRef.current = true;
      console.warn(
        `[useMatchSession] moves取りこぼし検出: local=${localCount} → server=${serverCount}、resyncします`,
      );

      reconnect();

      const serverTurn = goBoard.loadMoves(payload.moves);
      liveAnalysis.truncate(payload.moves.length); // 🐱 moves差し替えに合わせて分析データも整合させる
      clock.unfreeze(serverTurn);
      isResyncingRef.current = false;
    }
  };

  // 🌟 -------- 時計の用意！ --------
  const clock = useMatchClock({
    matchId,
    myColor,
    initialTurn: goBoard.initialTurn,
    initialMySeconds,
    initialOppSeconds,
    isGameEnded,
    handleServerSync,
  });

  // 🌟 -------- 着手系--------
  // katagoが手を打つ
  const handleRunBotTurn = useCallback(async () => {
    // 🐱 botの手がこの後何手目として記録されるか。add_move呼び出し前(まだ
    //    ローカルに反映されていない)時点のmovesRef長がそのままインデックス。
    const botMoveIndex = movesRef.current.length;

    await botMove.runBotTurn(
      boardRef.current,
      movesRef.current,
      matchType,
      async (grid: Grid, analysis) => {
        // 🐱 着手決定のついでに手に入った分析結果を、二重に呼び直さず記録する。
        liveAnalysis.record(botMoveIndex, analysis);

        await supabase.rpc("add_move", {
          p_match_id: matchId,
          p_move: grid,
          p_is_bot: true,
        });
        // ボットの着手成功時にハートビートタイマーをリセット
        clock.resetHeartbeat();
      },
    );
  }, [botMove, matchType, matchId, clock, liveAnalysis, boardRef, movesRef]);

  // 人間が手を打つ
  const handlePutStone = async (grid: Grid) => {
    if (!clock.isMyTurn || isGameEnded || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    clock.freeze(); // 🥶 タップした瞬間から結果が確定するまで、誰の番でもない

    const applied = goBoard.applyLegalMove(grid, myColor);
    if (!applied) {
      clock.unfreeze(myColor); // 非合法手なら即座に自分の番へ戻す
      isSubmittingRef.current = false;
      return;
    }

    // 🐱 この手が何手目(0-indexed)として記録されるか。やり直しの場合は
    //    同じインデックスに対してrecordが上書きされるので、後始末は不要。
    const myMoveIndex = goBoard.movesRef.current.length - 1;

    // 🥶 kataGo計算・RPC送信をまとめて1つのtry/catch/finallyで保護する。
    // どちらで失敗・例外が起きても、必ず「石を戻す→自分の番に戻す→送信フラグを解放する」
    // という後始末に辿り着けるようにするための一本化。
    try {
      const x = goBoard.boardHistoryRef.current[goBoard.currentIndex];
      const analysis = await kataGoTask.run({
        board: x,
        movesSoFar: goBoard.moves,
        matchType,
        boardSize,
        modelId: opponentModelId,
        currentPlayer: myColor,
      });
      liveAnalysis.record(myMoveIndex, analysis);

      // 🥶 ここから実際にサーバーへ送信する。以降frozenが3秒以上続いたら
      // useMatchClock側のタイムアウト救済が働く(通信ロス等の異常検知用)。
      clock.markWaitingForServer();

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
      // kataGoの計算失敗・RPC通信の例外、どちらもここでまとめて拾う
      console.error("着手処理で例外発生:", e);
      goBoard.loadMoves(goBoard.movesRef.current.slice(0, -1));
      clock.unfreeze(myColor); // 例外でも自分の番へ戻す
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // 人間が投了
  const handleResign = async () => {
    if (!clock.isMyTurn || isGameEnded) return;

    clock.freeze(); // 🥶 投了確定までボットの自動着手・自分のタップを止める

    // 🐱 投了はダブルパスを経由しないので、gameCh_double_passの
    //    endgame.analyzeTerritory相当の「最終局面の分析」がここでしか
    //    埋められない。既に打たれている最後の手の効果を測るための、
    //    perMove[movesRef.current.length]をここで記録する。
    try {
      const finalMoveIndex = goBoard.movesRef.current.length;
      const analysis = await kataGoTask.run({
        board: goBoard.boardRef.current,
        movesSoFar: goBoard.movesRef.current,
        matchType,
        boardSize,
        modelId: opponentModelId,
        // 投了直前の最終局面なので、次に打つ側(実際にはもう打たれないが)を渡す。
        // handlePutStoneの修正時と同じ理屈で、直前に打ったのはoppColorのはず。
        currentPlayer: myColor,
      });
      liveAnalysis.record(finalMoveIndex, analysis);
    } catch (e) {
      console.error("投了前の最終局面分析で例外発生:", e);
      // 分析に失敗しても投了処理自体は続行する(採点できないだけで、
      // 投了そのものをブロックする理由にはならない)
    }

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

  // 🌟 -------- チャンネル系 --------
  // gameチャンネルから手の通知が来た時の処理。
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

      // 🐱 相手が人間の場合だけ、ここで分析する。相手がbotの場合は
      //    handleRunBotTurn側で着手決定のついでに既に記録済みなので、
      //    ここで二重に呼ばない。
      if (!botMatch) {
        const oppMoveIndex = goBoard.movesRef.current.length - 1;
        const x =
          goBoard.boardHistoryRef.current[goBoard.movesRef.current.length];
        const analysis = await kataGoTask.run({
          board: x,
          movesSoFar: goBoard.movesRef.current,
          matchType,
          boardSize,
          modelId: "b18", // 相手が人間ならb18
          currentPlayer: myColor, // 相手が打った直後は自分の番
        });
        liveAnalysis.record(oppMoveIndex, analysis);
      }

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

  // gameチャンネルからダブルパス通知が来た時の処理。
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

  // gameチャンネルからポイント更新の通知が来た時の処理。
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
      clock.stopClock();
      setLoading(false);
    }
  };

  const { reconnect } = useGameChannel(
    matchId,
    {
      onMove: gameCh_move,
      onDoublePass: gameCh_double_pass,
      onRatingUpdated: gameCh_rating_updated,
    },
    !isGameEnded,
  );

  // -------- useEffect --------
  useEffect(() => {
    const isBotTurn = clock.turnState === oppColor;
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

  // -------- return --------
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
