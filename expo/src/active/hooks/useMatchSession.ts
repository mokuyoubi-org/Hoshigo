// @/src/active/hooks/useMatchSession.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局進行そのもの、を1つにまとめる。
//   - useGoBoardState : 盤面・履歴
//   - useBotMove       : ボット思考
//   - useMatchClock     : 手番・時間・ハートビート
//   - useGameChannel   : gameChannelの購読
//   - game_move / game_double_pass / game_finished : 4つの購読ハンドラ本体
//
// ─── なぜまとめたか ───
// 以前は、KataGoの分析結果(currentOwnershipRef)を「useGoBoardStateが持ち、
// useBotMoveの結果をPlaying.tsx側が代入する」という、2つのhookをPlaying.tsxが
// 仲介する形になっていた。呼び出し箇所が4つあり、どれか1つでも代入を忘れると
// 終局計算が壊れる「地雷」になっていた。
// すべてこのhookの中に閉じ込めることで、Playing.tsxはownershipの存在すら
// 意識しなくてよくなる。
// ──────────────────────────────────────────────────

import { colorToDbString } from "@/src/active/logics/matchLogics";
import { resultToComment } from "@/src/active/logics/utilLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import {
  BoardSize,
  Color,
  Grid,
  MatchType,
  WHITE,
} from "@/src/stable/types/goTypes";
import { useEffect, useState } from "react";
import { TranslationKey } from "../types/translationTypes";
import { useBotMove } from "./useBotMove";
import { useGameChannel } from "./useGameChannel";
import { useGoBoardState } from "./useGoBoardState";
import { useMatchClock } from "./useMatchClock";

type Args = {
  matchId: number;
  myColor: Color;
  oppColor: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  movesInt: number[];
  botMatch: boolean;
  initialMySeconds: number;
  initialOppSeconds: number;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  // 着手が反映された瞬間に呼ばれる(効果音再生など、UI側の副作用のため)
  onOwnMoveApplied?: () => void;
};

export function useMatchSession({
  matchId,
  myColor,
  oppColor,
  boardSize,
  matchType,
  movesInt,
  botMatch,
  initialMySeconds,
  initialOppSeconds,
  t,
  onOwnMoveApplied,
}: Args) {
  const goBoard = useGoBoardState({ boardSize, matchType, movesInt });
  const botMove = useBotMove(myColor, boardSize);

  const [isGameEnded, setIsGameEnded] = useState(false);
  const [resultComment, setResultComment] = useState("");
  const [loading, setLoading] = useState(false);

  const clock = useMatchClock({
    matchId,
    myColor,
    initialTurn: goBoard.initialTurn,
    initialMySeconds,
    initialOppSeconds,
    isGameEnded,
  });

  // ─── 着手 ─────────────────────────────────────────
  const handlePutStone = async (grid: Grid) => {
    if (!clock.isMyTurn || isGameEnded) return;

    const applied = goBoard.applyOwnMove(grid, myColor);
    if (!applied) return;

    onOwnMoveApplied?.();

    // ボット戦でない場合、地合い分析用にownershipだけ更新(内部で完結)
    if (!botMatch) {
      const result = await botMove.analyze(
        goBoard.boardRef.current,
        goBoard.movesRef.current,
        matchType,
      );
      if (result?.ownership) {
        goBoard.currentOwnershipRef.current = result.ownership;
      } else {
        console.warn(
          "[useMatchSession] 自分の着手後の地合い分析結果を取得できませんでした(Skip)",
        );
      }
    }

    clock.setTurn(oppColor);

    const { error } = await supabase.rpc("add_move", {
      p_match_id: matchId,
      p_move: grid,
      p_color: colorToDbString(myColor),
    });

    if (error) {
      console.error("着手送信失敗:", error);
      goBoard.revertLastOwnMove();
      clock.setTurn(myColor);
    }
  };

  // ─── 投了 ─────────────────────────────────────────
  const handleResign = async () => {
    if (!clock.isMyTurn || isGameEnded) return;

    clock.setIsMyTurn(false);

    const { error } = await supabase.rpc("resign", {
      p_match_id: matchId,
      p_color: colorToDbString(myColor),
    });

    if (error) {
      console.error("投了送信失敗:", error);
      clock.setIsMyTurn(true);
    }
  };

  // ─── gameチャンネルのmoveイベント ─────────────────────
  // 受け取るもの: move / move_count / turn / black_seconds / white_seconds
  const game_move = async (payload: any) => {
    if (isGameEnded) return;
    const data = payload.payload ?? payload;
    const move: number = data.move;
    const moveCount: number = data.move_count;

    clock.syncSecondsFromServer(
      Number(data.black_seconds),
      Number(data.white_seconds),
    );

    const isNewMove = moveCount === goBoard.movesRef.current.length + 1;
    const isMyMove = moveCount === goBoard.movesRef.current.length;

    // プレイヤの手を受け取ると、ボットが打つ(適用はまだしない)
    if (botMatch && isMyMove && data.turn === oppColor) {
      await botMove.runBotTurn(
        goBoard.boardRef.current,
        goBoard.movesRef.current,
        matchType,
        async (grid, ownership) => {
          if (ownership) {
            goBoard.currentOwnershipRef.current = ownership;
          }
          await supabase.rpc("add_move", {
            p_match_id: matchId,
            p_move: grid,
            p_color: colorToDbString(oppColor),
          });
        },
      );
      return;
    }

    if (isNewMove) {
      goBoard.applyRemoteMove(move, oppColor);

      if (!botMatch) {
        const result = await botMove.analyze(
          goBoard.boardRef.current,
          goBoard.movesRef.current,
          matchType,
        );
        if (result?.ownership) {
          goBoard.currentOwnershipRef.current = result.ownership;
        } else {
          console.warn(
            "[useMatchSession] 相手の着手後の地合い分析結果を取得できませんでした(Skip)",
          );
        }
      }

      clock.setTurn(myColor);
    }
  };

  // ─── gameチャンネルのdouble_passイベント ────────────────
  const game_double_pass = async (payload: any) => {
    if (isGameEnded) return;
    setLoading(true);

    const { result } = goBoard.computeTerritory();

    const { data, error } = await supabase.rpc("submit_match_result", {
      p_match_id: matchId,
      p_result: result,
    });
    if (data) console.error("result提出成功:", data);
    if (error) console.error("result提出失敗:", error);
  };

  // ─── gameチャンネルのfinishedイベント ────────────────
  const game_finished = (payload: any) => {
    const data = payload.payload ?? payload;

    setLoading(false);
    const result: string = data.result;

    const resTmp = goBoard.computeTerritory();
    goBoard.territoryBoardRef.current = resTmp.territoryBoard;

    setResultComment(
      resultToComment(result, myColor, t) ?? t("common.matchComplete"),
    );

    setIsGameEnded(true);
    clock.stopClock();
    // gameChannelの解除はuseGameChannel側が isGameEnded を見て自動的に行う。
  };

  useGameChannel(
    matchId,
    {
      onMove: game_move,
      onDoublePass: game_double_pass,
      onFinished: game_finished,
    },
    !isGameEnded,
  );

  // ─── ボットが先手の場合、対局開始時に一度だけ打たせる ──────────
  // matchType>=2(互先以外、置き碁など)か、自分が白番(=相手の黒が先手)の時、
  // マウント時点でまだボットが打っていなければ打たせる。
  useEffect(() => {
    if (!botMatch) return;
    if (matchType >= 2 || myColor === WHITE) {
      botMove.runBotTurn(
        goBoard.boardRef.current,
        goBoard.movesRef.current,
        matchType,
        async (grid, ownership) => {
          if (ownership) {
            goBoard.currentOwnershipRef.current = ownership;
          }
          await supabase.rpc("add_move", {
            p_match_id: matchId,
            p_move: grid,
            p_color: colorToDbString(oppColor),
          });
        },
      );
    }
  }, []);

  return {
    // 盤面
    boardHistory: goBoard.boardHistory,
    boardHistoryRef: goBoard.boardHistoryRef,
    agehamaHistory: goBoard.agehamaHistory,
    movesRef: goBoard.movesRef,
    currentIndex: goBoard.currentIndex,
    setCurrentIndex: goBoard.setCurrentIndex,
    territoryBoardRef: goBoard.territoryBoardRef,
    goToLatest: goBoard.goToLatest,
    // 時間・手番
    isMyTurn: clock.isMyTurn,
    mySeconds: clock.mySeconds,
    oppSeconds: clock.oppSeconds,
    // 結果
    isGameEnded,
    resultComment,
    loading,
    setLoading,
    // 操作
    handlePutStone,
    handleResign,
  };
}
