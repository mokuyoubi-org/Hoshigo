// useMatchClock.ts
// 2026/09/12コメント

import { supabase } from "@/src/stable/services/supabase/supabase";
import { BLACK, Color, stringToColor } from "go-core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSounds } from "../useGameSounds";

export type ServerSyncPayload = {
  moves: number[];
  turn: Color;
};

// 🥶 対局の「今、誰が動けるか」を表す唯一の状態。
// 黒の番・白の番・誰も動けない(frozen)の3択。これ以外の値は存在しない。
type TurnState = Color | "frozen";

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
  myColor,
  initialTurn,
  initialMySeconds,
  initialOppSeconds,
  isGameEnded,
  handleServerSync,
}: Args) {
  // =========================================================================================
  // 🌟 ===================================== state =====================================
  // =========================================================================================
  // 🌟大量のrefは、毎秒カチカチするタイマー1: Tick-Timerの安定とのトレードオフ。
  // タイマー1の依存配列を汚さないためには、refにするしかない。
  // stateとrefのセット。
  // stateが必要なのは再レンダーを起こすため。
  const [turnState, setTurnState] = useState<TurnState>(initialTurn);
  const turnRef = useRef<TurnState>(initialTurn);
  const [mySeconds, setMySeconds] = useState(initialMySeconds);
  const mySecondsRef = useRef(initialMySeconds);
  const [oppSeconds, setOppSeconds] = useState(initialOppSeconds);
  const oppSecondsRef = useRef(initialOppSeconds);
  // タイマーのref
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 対局終了のref。これは、setIsGameEndedを見ればわかるが、本当の本当の対局の終わりのこと。
  const isGameEndedRef = useRef(isGameEnded);
  // freeze開始時刻のref
  const frozenAtRef = useRef<number | null>(null);

  useEffect(() => {
    isGameEndedRef.current = isGameEnded;
  }, [isGameEnded]);
  const myColorRef = useRef(myColor);
  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);
  const handleServerSyncRef = useRef(handleServerSync);
  useEffect(() => {
    handleServerSyncRef.current = handleServerSync;
  }, [handleServerSync]);
  const { playSound } = useSounds();
  const playSoundRef = useRef(playSound);
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  // =========================================================================================
  // 🌟 ===================================== 関数 =====================================
  // =========================================================================================
  // 🌟手番を黒 or 白に切り替える。
  const unfreeze = (color: Color) => {
    turnRef.current = color;
    frozenAtRef.current = null; // 🥶 解除したので計測もクリア
    setTurnState(color);
  };

  // 🌟誰の番でもない状態にする(人間が手を打って返ってくるまで・投了確定待ち・終局判定待ち)。
  const freeze = () => {
    turnRef.current = "frozen";
    frozenAtRef.current = Date.now();
    setTurnState("frozen");
  };

  // 🌟サーバから送られてきた残り時間に同期する
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

  // 🌟タイマー①②両方破壊する
  const destroyAllClocks = () => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  // 🌟🌟🌟🌟🌟ハートビートを送る時の処理。タイマー①によって10秒に一回行われるのは、この処理。
  // 結局このファイルの心臓部分はこの関数ということになる。
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
          destroyAllClocks();
          return;
        }
        console.error("ハートビート失敗:", error);
        return;
      }

      // ハートビート送信が失敗してたら、ここまでは辿りつかない。
      // 以下、ハートビートが成功し、その返してくる最新の情報を受け取るか受け取らないか、の処理。

      // まず、ハートビートからの返信を、frozen以外の時に受け取った場合。そのまま受け取る
      if (turnRef.current !== "frozen") {
        //
        console.log("ハートビートの返事を適用");
        const row = data?.[0];
        if (!row) return;

        handleServerSyncRef.current?.({
          moves: row.out_moves ?? [],
          turn: stringToColor(row.out_turn),
        });
      } else if (turnRef.current === "frozen") {
        // 🥶 frozenが「本当は解除されるべきなのに解除されていない」と判断するまでの猶予時間。
        // これより短いfreezeは正常な処理待ち(kataGo計算・RPC往復など)として無視される。
        const FROZEN_TIMEOUT_MS = 3_000;

        // frozenAtRef.currentは、人間がrpcでsupabaseに手を送った瞬間。
        // frozenAtRef.currentはunfreeze()でnullにセットされる
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

          handleServerSyncRef.current?.({
            moves: row.out_moves ?? [],
            turn: stringToColor(row.out_turn),
          });
        }
      }
    } catch (e) {
      console.error("ハートビート送信で例外発生:", e);
    }
  }, [matchId]);

  // 🌟着手などのタイミングでは、いっそのことタイマーを破棄してしまう。そして10秒後に再設定する
  const resetHeartbeat = useCallback(() => {
    const HEARTBEAT_INTERVAL_MS = 10_000;

    // 1. タイマーを捨てる
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    // 2. 新たにタイマーをセット
    heartbeatTimerRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS,
    );
  }, [sendHeartbeat]);

  // =========================================================================================
  // 🌟 ===================================== useEffect =====================================
  // =========================================================================================
  // タイマーは二つある。

  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  // 🌟🌟🌟🌟🌟タイマー1: Tick-Timer。 対局開始時、毎秒カチカチ表示用に時間を進めるタイマーを設置。
  // frozenの時も本当は毎秒動いてる。ただし、そのような時は何もしないのでタイマーが止まってるように見えるだけ。
  useEffect(() => {
    tickTimerRef.current = setInterval(() => {
      // 🛡️ガード
      // 対局終了時、frozenの時は何もしない
      if (isGameEndedRef.current || turnRef.current === "frozen") return;

      // 1. 相手の番！！
      if (turnRef.current !== myColorRef.current) {
        oppSecondsRef.current = Math.max(0, oppSecondsRef.current - 1);
        setOppSeconds(oppSecondsRef.current);
        return;
      }
      // 2. 自分の番！！
      else if (turnRef.current !== myColorRef.current) {
        mySecondsRef.current = Math.max(0, mySecondsRef.current - 1);
        setMySeconds(mySecondsRef.current);

        // 自分の残り時間が10秒以下（10秒〜1秒）になったらピッピ音を鳴らす
        if (mySecondsRef.current <= 10 && mySecondsRef.current > 0) {
          playSoundRef.current?.("pip");
        }
      }
    }, 1000);

    // 3. GameScreenから遷移して出ていった時に行われる、タイマー廃棄
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, []);

  // 🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
  // 🌟🌟🌟🌟🌟タイマー2: Heartbeat-Timer。 対局開始時、10秒に一回生存報告をするタイマーを設置。
  useEffect(() => {
    // 1. resetHeartbeat
    resetHeartbeat();

    // 2. GameScreenから遷移して出ていった時に行われる、タイマー廃棄
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [resetHeartbeat]);

  // =========================================================================================
  // 🌟 ===================================== return =====================================
  // =========================================================================================
  return {
    turnState, // 「誰の番か」を表示したい側(PlayerCardなど)が使う
    isMyTurn: turnState === myColor, // 「自分が打てるか」だけ知りたい側(GoBoardなど)が使う
    unfreeze,
    freeze,
    mySeconds,
    oppSeconds,
    syncSecondsFromServer,
    destroyAllClocks,
    resetHeartbeat, // 外部からタイマーリセットできるように公開
  };
}
