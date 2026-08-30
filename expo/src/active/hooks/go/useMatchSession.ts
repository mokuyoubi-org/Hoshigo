// useMatchSession.ts
// 対局のUIの責任者がGameScreenなら、useMatchSessionは対局のロジックの責任者。

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import {
  computeMatchResultUpdate,
  MatchResultUpdate,
} from "@/src/stable/logics/resultLogics";
import { resultToComment } from "@/src/stable/logics/resultToComment";
import { supabase } from "@/src/stable/services/supabase/supabase";
import {
  BoardSize,
  Color,
  Grid,
  MatchType,
  PASS_GRID,
  useGoBoardState,
} from "expo-goband";
import { useCallback, useEffect, useRef, useState } from "react";

import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { useTranslation } from "../../language/i18n";
import { useBotMove } from "./useBotMove";
import { useEndgameAnalysis } from "./useEndgameAnalysis";
import { useGameChannel } from "./useGameChannel";
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
  // -------- state --------
  const t = useTranslation();
  const goBoard = useGoBoardState({ boardSize, matchType, movesInt });
  const { boardRef, movesRef } = goBoard;
  const botMove = useBotMove(myColor, boardSize, oppUsername);
  const endgame = useEndgameAnalysis();
  const { points9, points13, acquiredIcons, updateProfile } = useProfile();
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [resultComment, setResultComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<
    Omit<MatchResultUpdate, "profilePatch">
  >(() => {
    const initialPoints = (boardSize === 9 ? points9 : points13) ?? 0;
    return {
      pointsBefore: initialPoints,
      rankIndexBefore: getRankInfo(initialPoints, t).index,
      pointsAfter: 0,
      rankIndexAfter: 0,
      newlyAcquiredIcons: [],
    };
  });
  const isResyncingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isBotThinkingRef = useRef(false);

  // -------- 関数 --------

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

      const serverTurn = goBoard.resyncFromMoves(payload.moves);
      clock.unfreeze(serverTurn);
      isResyncingRef.current = false;
    }
  };

  // 🌟時計の用意！
  const clock = useMatchClock({
    matchId,
    myColor,
    initialTurn: goBoard.initialTurn, // このinitialturnは本当の一番最初とは限らない。接続復帰した時の一番最初の手の可能性もある。
    initialMySeconds,
    initialOppSeconds,
    isGameEnded,
    handleServerSync,
  });

  // 着手系(ボット着手、人間着手、人間投了)。ボットの投了は存在しないと思っていいのかな。
  // katagoが手を打つ
  const handleRunBotTurn = useCallback(async () => {
    await botMove.runBotTurn(
      boardRef.current,
      movesRef.current,
      matchType,
      async (grid: Grid) => {
        await supabase.rpc("add_move", {
          p_match_id: matchId,
          p_move: grid,
          p_is_bot: true,
        });
      },
    );
  }, [botMove, matchType, matchId]);

  // 人間が手を打つ
  const handlePutStone = async (grid: Grid) => {
    if (!clock.isMyTurn || isGameEnded || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    clock.freeze(); // 🥶 タップした瞬間から結果が確定するまで、誰の番でもない

    const applied = goBoard.applyOwnMove(grid, myColor);
    if (!applied) {
      clock.unfreeze(myColor); // 非合法手なら即座に自分の番へ戻す
      isSubmittingRef.current = false;
      return;
    }

    try {
      // supabase送信
      const { error } = await supabase.rpc("add_move", {
        p_match_id: matchId,
        p_move: grid,
      });

      // 失敗した場合、なかったことにしてまたやり直し
      if (error) {
        console.error("着手送信失敗:", error);
        goBoard.revertLastOwnMove();
        clock.unfreeze(myColor); // 失敗したら自分の番へ戻す
        return;
      }

      // 🥶 自分の手がダブルパスだった場合、そのままfrozenを維持
      const moves = goBoard.movesRef.current;
      const isDoublePass =
        grid === PASS_GRID && moves[moves.length - 2] === PASS_GRID;

      if (!isDoublePass) {
        clock.unfreeze(oppColor);
      }
    } catch (e) {
      console.error("着手送信で例外発生:", e);
      goBoard.revertLastOwnMove();
      clock.unfreeze(myColor); // 例外でも自分の番へ戻す
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // 人間が投了
  const handleResign = async () => {
    if (!clock.isMyTurn || isGameEnded) return;

    clock.freeze(); // 🥶 投了確定までボットの自動着手・自分のタップを止める

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

  // チャンネル系
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
      goBoard.applyRemoteMove(move, oppColor);
      isSubmittingRef.current = false;

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

    const deadStones = await endgame.analyzeTerritory(
      goBoard.boardRef.current,
      goBoard.movesRef.current,
      matchType,
      boardSize,
    );
    goBoard.setDeadStones(deadStones);

    const { result } = goBoard.computeTerritory();

    const { data, error } = await supabase.rpc("submit_match_result", {
      p_match_id: matchId,
      p_result: result,
      p_dead_stones: deadStones,
    });
    if (data) console.error("result提出成功:", data);
    if (error) console.error("result提出失敗:", error);
  };

  // gameチャンネルからポイント更新の通知が来た時の処理。
  const gameCh_points_updated = (payload: any) => {
    // 通知が届く。dataは"black"と"white"と"result"に分かれている。
    const data = payload.payload ?? payload;
    if (!data) return;

    // 🌟"black"もしくは"white"
    const myData = myColor === 1 ? data.black : data.white;

    if (myData) {
      const updated = computeMatchResultUpdate(
        boardSize,
        myData,
        points9 ?? 0,
        points13 ?? 0,
        acquiredIcons ?? [],
        t,
      );
      if (updated) {
        const { profilePatch, ...displayResult } = updated;
        setMatchResult(displayResult); // 表示用state
        updateProfile(profilePatch); // 🥶 beforeを読み終えてから書き換える(順番厳守)
      }
    }

    // 🌟"result"
    if (data.result) {
      const resTmp = goBoard.computeTerritory();
      goBoard.setTerritoryBoard(resTmp.territoryBoard);

      setResultComment(
        resultToComment(data.result, myColor, t) ?? t("common.matchComplete"),
      );
      // お互いの着手が終わり、そしてポイント更新まで帰ってきて、初めて対局終了となる。
      // なぜこのような「本当の本当の終わり」のタイミングでセットしているかというと、
      // gameResultModalの発火要因になっているから。GameScreen.tsxのuseEffect参照。
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
      onPointsUpdated: gameCh_points_updated,
    },
    !isGameEnded,
  );

  // -------- useEffect --------
  // いつ発火して欲しいか？
  // 1. 対局が始まった時(接続復帰含む)にボットのターンだった場合。
  // 2. ターンが変わってボットの手番になった場合。
  useEffect(() => {
    const isBotTurn = clock.turnState === oppColor; // 🥶 本当にボットの番の時だけ発火
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
  }, [botMatch, clock.turnState]);

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
    isMyTurn: clock.isMyTurn, // GoBoardなど「自分が打てるか」だけ知りたい側向け
    turnState: clock.turnState, // PlayerCardなど「誰の番か(frozen含む)」表示したい側向け
    mySeconds: clock.mySeconds,
    oppSeconds: clock.oppSeconds,
    isGameEnded,
    resultComment,
    loading,
    setLoading,
    handlePutStone,
    handleResign,
    ...matchResult,
  };
}
