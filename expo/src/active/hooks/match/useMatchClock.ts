// useMatchClock.ts

import { supabase } from "@/src/stable/services/supabase/supabase";
import { BLACK, Color, stringToColor } from "expo-goband";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSounds } from "../useSounds";

export type ServerSyncPayload = {
  moves: number[];
  turn: Color;
};

// 🥶 対局の「今、誰が動けるか」を表す唯一の状態。
// 黒の番・白の番・誰も動けない(frozen)の3択。これ以外の値は存在しない。
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

// 🥶 frozenが「本当は解除されるべきなのに解除されていない」と判断するまでの猶予時間。
// これより短いfreezeは正常な処理待ち(kataGo計算・RPC往復など)として無視される。
const FROZEN_TIMEOUT_MS = 3_000;

export function useMatchClock({
  matchId,
  myColor,
  initialTurn,
  initialMySeconds,
  initialOppSeconds,
  isGameEnded,
  handleServerSync: onServerSync,
}: Args) {
  const [turnState, setTurnState] = useState<TurnState>(initialTurn);
  const turnRef = useRef<TurnState>(initialTurn);

  // 🥶 「サーバーへの応答待ちに入った時刻」を記録するref。
  // freeze()の時点ではまだセットしない(kataGo計算などまだサーバーに何も投げていない間は計測しない)。
  // markWaitingForServer()が呼ばれた時にだけセットされ、unfreeze()でクリアされる。
  const frozenAtRef = useRef<number | null>(null);

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

  // 🐱 中で直接 useSounds を呼び出すにゃ！
  const { playSound } = useSounds();

  // 🐱 タイマー（setInterval）対策として playSound を Ref に入れるにゃ
  const playSoundRef = useRef(playSound);
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  // ─── 関数定義 ─────────────────────────────────────

  // 手番を黒 or 白に切り替える。
  const unfreeze = (color: Color) => {
    turnRef.current = color;
    frozenAtRef.current = null; // 🥶 解除したので計測もクリア
    setTurnState(color);
  };

  // 🥶 誰の番でもない状態にする(投了確定待ち・終局判定待ちなど)。
  // 注意: ここではまだ計測を開始しない。kataGo計算などまだサーバーに何も投げていない間に
  // タイムアウトが誤発火しないよう、計測開始は markWaitingForServer() に分離している。
  const freeze = () => {
    turnRef.current = "frozen";
    setTurnState("frozen");
  };

  // 🥶 「実際にサーバーへ着手を送信する直前」に呼んでもらう。
  // ここから3秒以上経ってもfrozenのままなら、通信ロスなど異常事態とみなす。
  const markWaitingForServer = () => {
    frozenAtRef.current = Date.now();
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
  // ハートビートを1回送信する処理
  const sendHeartbeat = useCallback(async () => {
    if (isGameEndedRef.current) return;

    console.log(
      "🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩ハートビート送信🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩",
    );

    try {
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

      // まとめると、frozenじゃない時にはいつでも受け取る。frozenの時でも、
      // markWaitingForServer()からFROZEN_TIMEOUT_MS(3秒)以上経っているならおかしいので受け取る。
      // まだ経ってないならスルー。
      // なぜスルーするかというと、frozenの時は、「手を本当は打っているがsupabaseからの
      // サブスク通知だけまだ届いていない」ということもあり得るため。
      // しかしとはいえサブスク通知が返ってくるまで3秒以上経っているのはおかしいので、
      // もしそうなら話が変わってくる。ハートビートの返信を真実とする。
      if (turnRef.current === "frozen") {
        const frozenDuration = frozenAtRef.current
          ? Date.now() - frozenAtRef.current
          : null;

        // frozenAtRefが未セット(=まだサーバーに何も投げていない段階、
        // 例えばkataGo計算中)なら、タイムアウト判定の対象外として無視する。
        if (frozenDuration === null || frozenDuration < FROZEN_TIMEOUT_MS) {
          console.log("frozenの状態の時のハートビートの返事は無視");
        } else {
          console.log(
            `frozenになってから${frozenDuration}ms経過、異常なのでハートビートの返事を適用`,
          );
          const row = data?.[0];
          if (!row) return;

          onServerSyncRef.current?.({
            moves: row.out_moves ?? [],
            turn: stringToColor(row.out_turn),
          });
        }
      } else {
        console.log("ハートビートの返事を適用");
        const row = data?.[0];
        if (!row) return;

        onServerSyncRef.current?.({
          moves: row.out_moves ?? [],
          turn: stringToColor(row.out_turn),
        });
      }
    } catch (e) {
      console.error("ハートビート送信で例外発生:", e);
    }
  }, [matchId]);

  // 着手などのタイミングでタイマーを破棄し、10秒後に再設定する
  const resetHeartbeat = useCallback(() => {
    const HEARTBEAT_INTERVAL_MS = 10_000;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    heartbeatTimerRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS,
    );
  }, [sendHeartbeat]);

  useEffect(() => {
    resetHeartbeat();

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [resetHeartbeat]);

  // ─── 表示用タイマー ─────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isGameEndedRef.current) return;
      if (turnRef.current === "frozen") return; // 🥶 誰の時計も進めない

      if (turnRef.current !== myColorRef.current) {
        oppSecondsRef.current = Math.max(0, oppSecondsRef.current - 1);
        setOppSeconds(oppSecondsRef.current);

        // 🆕 相手の番でも10秒以下（10秒〜1秒）なら「ぴっぴ」鳴らす？
        return;
      }

      mySecondsRef.current = Math.max(0, mySecondsRef.current - 1);
      setMySeconds(mySecondsRef.current);

      // 🆕 自分の残り時間が10秒以下（10秒〜1秒）になったら音を鳴らす
      if (mySecondsRef.current <= 10 && mySecondsRef.current > 0) {
        playSoundRef.current?.("pip");
      }
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
    markWaitingForServer, // 🆕 サーバー応答待ちの計測を開始したい側(useMatchSessionなど)が使う
    mySeconds,
    oppSeconds,
    syncSecondsFromServer,
    stopClock,
    resetHeartbeat, // 外部からタイマーリセットできるように公開
  };
}
