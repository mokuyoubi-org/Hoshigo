// useMatchClock.ts
// 2026/10/12: Cloudflare版。ハートビート(生存報告)を廃止。
// 時計の役目は「毎秒カチカチ表示を進める」「誰の番かを持つ」だけ。

import { BLACK, Color } from "go-core";
import { useKVStorage } from "kv-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameSounds } from "../common/useGameSounds";

// 🥶 対局の「今、誰が動けるか」を表す唯一の状態。
// 黒の番・白の番・誰も動けない(frozen)の3択。これ以外の値は存在しない。
type TurnState = Color | "frozen";

type Args = {
  myColor: Color;
  initialTurn: Color;
  initialMySeconds: number;
  initialOppSeconds: number;
  isGameEnded: boolean;
};

export const useMatchClock = ({
  myColor,
  initialTurn,
  initialMySeconds,
  initialOppSeconds,
  isGameEnded,
}: Args) => {
  // =========================================================================================
  // 🌟 ===================================== state =====================================
  // =========================================================================================
  // stateとrefのセット。stateは再レンダーのため、refは毎秒のタイマーの中で最新を読むため。
  const [turnState, setTurnState] = useState<TurnState>(initialTurn);
  const turnRef = useRef<TurnState>(initialTurn);
  const [mySeconds, setMySeconds] = useState(initialMySeconds);
  const mySecondsRef = useRef(initialMySeconds);
  const [oppSeconds, setOppSeconds] = useState(initialOppSeconds);
  const oppSecondsRef = useRef(initialOppSeconds);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 本当の本当の対局の終わり
  const isGameEndedRef = useRef(isGameEnded);
  const { value: isSoundEnabled } = useKVStorage<boolean>(
    "global.sound",
    false,
  );

  useEffect(() => {
    isGameEndedRef.current = isGameEnded;
  }, [isGameEnded]);
  const myColorRef = useRef(myColor);
  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);
  const { playSound } = useGameSounds();
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
    setTurnState(color);
  };

  // 🌟誰の番でもない状態にする(人間が手を打って返ってくるまで・投了確定待ち・終局判定待ち)。
  const freeze = () => {
    turnRef.current = "frozen";
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

  // 🌟タイマーを破壊する
  const destroyAllClocks = () => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  };

  // =========================================================================================
  // 🌟 ===================================== useEffect =====================================
  // =========================================================================================
  // 🌟Tick-Timer。対局開始時、毎秒カチカチ表示用に時間を進めるタイマーを設置。
  // frozenの時も本当は毎秒動いてる。ただし、そのような時は何もしないのでタイマーが止まってるように見えるだけ。
  useEffect(() => {
    tickTimerRef.current = setInterval(() => {
      // 🛡️ガード:対局終了時、frozenの時は何もしない
      if (isGameEndedRef.current || turnRef.current === "frozen") return;

      // 1. 相手の番！！
      if (turnRef.current !== myColorRef.current) {
        oppSecondsRef.current = Math.max(0, oppSecondsRef.current - 1);
        setOppSeconds(oppSecondsRef.current);
        return;
      }
      // 2. 自分の番！！
      else if (turnRef.current === myColorRef.current) {
        mySecondsRef.current = Math.max(0, mySecondsRef.current - 1);
        setMySeconds(mySecondsRef.current);

        // 自分の残り時間が10秒以下（10秒〜1秒）になったらピッピ音を鳴らす
        if (
          isSoundEnabled &&
          mySecondsRef.current <= 10 &&
          mySecondsRef.current > 0
        ) {
          playSoundRef.current?.("pip");
        }
      }
    }, 1000);

    // GameScreenから遷移して出ていった時に行われる、タイマー廃棄
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, []);

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
  };
};