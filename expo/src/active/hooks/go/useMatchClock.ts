// ✅active
// useMatchClock.ts

import { supabase } from "@/src/stable/services/supabase/supabase";
import { BLACK, Color, stringToColor } from "expo-goband";
import { useCallback, useEffect, useRef, useState } from "react";

export type ServerSyncPayload = {
  moves: number[];
  turn: Color;
  blackSeconds: number;
  whiteSeconds: number;
};

// 🥶 対局の「今、誰が動けるか」を表す唯一の状態。
// 黒の番・白の番・誰も動けない(frozen)の3択。これ以外の値は存在しない。
/*
1. 黒の番:	not frozen(turnState === myColor)
2. タップ:	ここでfreeze()発火、frozen開始
3. 合法手確認:	frozen中(ダメなら即黒に戻ってfrozen終了)
4〜5. 送受信の往復:	frozen中(エラーなら黒に戻ってfrozen終了)
6. レスポンス受信:	frozen終了の判定はここで行われる
7. 白の番 or 継続frozen:	6.成功&非ダブルパスなら白の番、6.成功&ダブルパスならfrozen継続
*/
export type TurnState = Color | "frozen";

type Args = {
  matchId: number;
  myColor: Color;
  initialTurn: Color;
  initialMySeconds: number;
  initialOppSeconds: number;
  isGameEnded: boolean;
  handleServerSync?: (payload: ServerSyncPayload) => void;
};

export function useMatchClock({
  matchId,
  myColor, // 
  initialTurn, 
  initialMySeconds,
  initialOppSeconds,
  isGameEnded,
  handleServerSync: onServerSync,
}: Args) {
  const [turnState, setTurnState] = useState<TurnState>(initialTurn);
  const turnRef = useRef<TurnState>(initialTurn);

  const mySecondsRef = useRef(initialMySeconds);
  const oppSecondsRef = useRef(initialOppSeconds);
  const [mySeconds, setMySeconds] = useState(initialMySeconds);
  const [oppSeconds, setOppSeconds] = useState(initialOppSeconds);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGameEndedRef = useRef(isGameEnded);
  useEffect(() => {
    isGameEndedRef.current = isGameEnded;
  }, [isGameEnded]);

  const myColorRef = useRef(myColor);
  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);

  const onServerSyncRef = useRef(onServerSync);
  useEffect(() => {
    onServerSyncRef.current = onServerSync;
  }, [onServerSync]);

  // ─── 関数定義 ─────────────────────────────────────

  // 手番を黒 or 白に切り替える。
  const unfreeze = (color: Color) => {
    turnRef.current = color;
    setTurnState(color);
  };

  // 🥶 誰の番でもない状態にする(投了確定待ち・終局判定待ちなど)。
  // この概念を知っているのはこのhookの中だけでいい。
  const freeze = () => {
    turnRef.current = "frozen";
    setTurnState("frozen");
  };

  // サーバから送られてきた残り時間に同期する
  const syncSecondsFromServer = useCallback(
    (blackSeconds: number, whiteSeconds: number) => {
      mySecondsRef.current =
        myColorRef.current === BLACK ? blackSeconds : whiteSeconds;
      oppSecondsRef.current =
        myColorRef.current === BLACK ? whiteSeconds : blackSeconds;
      setMySeconds(mySecondsRef.current);
      setOppSeconds(oppSecondsRef.current);
    },
    [],
  );

  const stopClock = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  // ─── ハートビート ─────────────────────────────────
  useEffect(() => {
    const HEARTBEAT_INTERVAL_MS = 10_000;

    const sendHeartbeat = async () => {
      if (isGameEndedRef.current) return;

      const { data, error } = await supabase.rpc("update_last_seen", {
        p_match_id: matchId,
      });

      if (error) {
        if (
          error.code === "P0001" ||
          error.message?.includes("マッチが見つかりません")
        ) {
          stopClock();
          return;
        }
        console.error("ハートビート失敗:", error);
        return;
      }

      const row = data?.[0];
      if (!row) return;

      const blackSec = Number(row.out_black_seconds);
      const whiteSec = Number(row.out_white_seconds);

      // サーバから送られてきた残り時間に同期する
      syncSecondsFromServer(blackSec, whiteSec);

      onServerSyncRef.current?.({
        moves: row.out_moves ?? [],
        turn: stringToColor(row.out_turn),
        blackSeconds: blackSec,
        whiteSeconds: whiteSec,
      });
    };

    sendHeartbeat();

    // 10秒ごとにsendHeartbeat()を行う、ということ。
    // heartbeatTimerRef.currentには、タイマーの番号が入る。
    // 123番のタイマー、ストップ！！みたいな感じ。
    heartbeatTimerRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS,
    );

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [matchId, syncSecondsFromServer]);

  // ─── 表示用タイマー ─────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isGameEndedRef.current) return;
      if (turnRef.current === "frozen") return; // 🥶 誰の時計も進めない

      if (turnRef.current !== myColorRef.current) {
        oppSecondsRef.current = Math.max(0, oppSecondsRef.current - 1);
        setOppSeconds(oppSecondsRef.current);
        return;
      }

      mySecondsRef.current = Math.max(0, mySecondsRef.current - 1);
      setMySeconds(mySecondsRef.current);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    turnState, // 「誰の番か」を表示したい側(PlayerCardなど)が使う
    isMyTurn: turnState === myColor, // 「自分が打てるか」だけ知りたい側(GoBoardなど)が使う
    unfreeze,
    freeze,
    mySeconds,
    oppSeconds,
    syncSecondsFromServer,
    stopClock,
  };
}
