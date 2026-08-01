// @/src/active/hooks/useMatchClock.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 「今どちらの手番か」「残り時間はどれだけか」「生存通知(ハートビート)」を
// まとめて管理する。
//
// setTurn(color)  : 手番が切り替わった時に呼ぶ。isMyTurn state と turnRef を
//                    同時に更新するので、呼び出し側は2つの整合性を気にしなくてよい。
// setIsMyTurn(bool): 手番自体は変わらないが、UIだけ一時的に無効化したい時
//                    (投了送信中など)に使う、生のsetter。
// syncSecondsFromServer: gameChannelのmoveイベントで届いたblack_seconds/
//                    white_secondsを、自分・相手それぞれの残り秒数に変換して反映する。
// stopClock       : 対局終了時にタイマーとハートビートを止める。
//
// ── ボーナス修正 ──
// 元のPlaying.tsxでは表示用タイマーのuseEffect内で`if (isGameEnded) return`と
// 書いていたが、依存配列が[]なのでこのisGameEndedは常にマウント時の値(false)の
// ままだった(stale closure)。実害は無かった(game_finished側でclearIntervalして
// いたため)が、ここではisGameEndedRefを使って正しく参照するようにしている。
// ──────────────────────────────────────────────────

import { supabase } from "@/src/stable/services/supabase/supabase";
import { BLACK, Color } from "@/src/stable/types/goTypes";
import { useEffect, useRef, useState } from "react";

type Args = {
  matchId: number;
  myColor: Color;
  initialTurn: Color;
  initialMySeconds: number;
  initialOppSeconds: number;
  isGameEnded: boolean;
};

export function useMatchClock({
  matchId,
  myColor,
  initialTurn,
  initialMySeconds,
  initialOppSeconds,
  isGameEnded,
}: Args) {
  const [isMyTurn, setIsMyTurn] = useState<boolean>(myColor === initialTurn);
  const turnRef = useRef<Color>(initialTurn);

  const mySecondsRef = useRef(initialMySeconds);
  const oppSecondsRef = useRef(initialOppSeconds);
  const [mySeconds, setMySeconds] = useState(initialMySeconds);
  const [oppSeconds, setOppSeconds] = useState(initialOppSeconds);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // stale closure対策: isGameEndedの最新値を常にrefへ同期しておく
  const isGameEndedRef = useRef(isGameEnded);
  useEffect(() => {
    isGameEndedRef.current = isGameEnded;
  }, [isGameEnded]);

  // 手番が切り替わった時に呼ぶ。isMyTurn stateとturnRefをまとめて更新する。
  const setTurn = (color: Color) => {
    turnRef.current = color;
    setIsMyTurn(color === myColor);
  };

  // gameChannelのmoveイベントで届いた残り秒数を、自分/相手それぞれに変換して反映
  const syncSecondsFromServer = (
    blackSeconds: number,
    whiteSeconds: number,
  ) => {
    mySecondsRef.current = myColor === BLACK ? blackSeconds : whiteSeconds;
    oppSecondsRef.current = myColor === BLACK ? whiteSeconds : blackSeconds;
    setMySeconds(mySecondsRef.current);
    setOppSeconds(oppSecondsRef.current);
  };

  // 対局終了時にタイマー・ハートビートを止める
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

  // ─── 表示用タイマー ─────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isGameEndedRef.current) return;

      if (turnRef.current !== myColor) {
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

  // ─── ハートビート ─────────────────────────────
  useEffect(() => {
    const HEARTBEAT_INTERVAL_MS = 10_000;

    // 10秒ごとにRPCでlast_seenをDBに書き込む。
    // RPCがclaim_disconnect_winの正当性検証に使う。
    const sendHeartbeat = async () => {
      const { data, error } = await supabase.rpc("update_last_seen", {
        p_match_id: matchId,
        p_color: myColor,
      });
      if (data) console.error("ハートビート成功:", data);
      if (error) console.error("ハートビート失敗:", error);
    };

    sendHeartbeat();
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
  }, []);

  return {
    isMyTurn,
    setIsMyTurn,
    turnRef,
    mySeconds,
    oppSeconds,
    setTurn,
    syncSecondsFromServer,
    stopClock,
  };
}
