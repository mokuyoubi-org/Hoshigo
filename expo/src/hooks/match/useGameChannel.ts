// useGameChannel.ts
// 2026/10/12: Cloudflare版。対局の部屋(/ws/game/:gameId)へ、つなぎっぱなしにする。
// - メッセージの種類ごとに、呼び出し元の関数へ振り分ける
// - 回線が途中で切れたら、自動でつなぎ直す(つなぎ直すと、サーバーが最新の盤面 "state" を送ってくれる)
// - サーバーが終局で閉じたとき("finished")は、つなぎ直さない

import { connectWs, WsConnection, WsMessage } from "@/src/services/api/ws";
import { useCallback, useEffect, useRef } from "react";

type GameChannelHandlers = {
  // つないだ直後に届く、最新の盤面・時計
  onState: (msg: WsMessage) => void;
  onMove: (msg: WsMessage) => void;
  onDoublePass: (msg: WsMessage) => void;
  onRatingUpdated: (msg: WsMessage) => void;
  // 終局で閉じるとき、rating_updated が届いていなくても、結果だけは渡す(保険)
  onFinished: (result: string) => void;
  // fatal = true なら、つなぎ直しても無駄なエラー
  onError: (msg: WsMessage, fatal: boolean) => void;
};

const MAX_RECONNECT = 10;

const MAX_RETRIES_GUARD = () => MAX_RECONNECT;

// つなぎ直しても直らないエラー
const FATAL_CODES = [
  "NOT_AUTHENTICATED",
  "NOT_A_PLAYER",
  "GAME_NOT_FOUND",
  "MAINTENANCE_MODE",
  "VERSION_INSUFFICIENT_APP",
  "VERSION_INSUFFICIENT_OTA",
];

export const useGameChannel = (
  gameId: string | null,
  handlers: GameChannelHandlers,
  enabled: boolean = true,
) => {
  // 毎回の描画で最新の関数に差し替える(古い関数を呼んでしまわないように)
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connectionRef = useRef<WsConnection | null>(null);
  // 「何回目のつなぎ直しか」の番号札。古い接続からの知らせを無視するために使う
  const generationRef = useRef(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});

  const closeConnection = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!gameId) return;

    closeConnection();
    const myGen = ++generationRef.current;
    let fatal = false;
    let finishedResult: string | null = null;

    // 少し待ってから、つなぎ直す(1秒、2秒、3秒…最大5秒)
    const scheduleRetry = () => {
      if (generationRef.current !== myGen) return;
      if (retryCountRef.current >= MAX_RETRIES_GUARD()) {
        console.error("🐱 対局の部屋に、つなぎ直せなかった");
        return;
      }
      retryCountRef.current += 1;
      const delay = Math.min(1000 * retryCountRef.current, 5000);
      retryTimerRef.current = setTimeout(() => {
        if (generationRef.current === myGen) connectRef.current();
      }, delay);
    };

    try {
      const conn = await connectWs(`/ws/game/${gameId}`, {
        onMessage: (msg) => {
          if (generationRef.current !== myGen) return;

          switch (msg.type) {
            case "state":
              retryCountRef.current = 0; // つながって、最新が届いた
              handlersRef.current.onState(msg);
              break;
            case "move":
              handlersRef.current.onMove(msg);
              break;
            case "double_pass":
              handlersRef.current.onDoublePass(msg);
              break;
            case "rating_updated":
              handlersRef.current.onRatingUpdated(msg);
              break;
            case "finished":
              finishedResult = msg.result ?? null;
              break;
            case "error": {
              fatal = FATAL_CODES.includes(msg.error?.code);
              handlersRef.current.onError(msg, fatal);
              break;
            }
          }
        },

        onClose: (info) => {
          if (generationRef.current !== myGen) return;
          connectionRef.current = null;
          if (info.byClient) return; // 自分で閉じた

          // サーバーが、終局で閉じた。メッセージは全部届いたあとなので、安心して結果を渡せる
          if (info.reason === "finished") {
            if (finishedResult) handlersRef.current.onFinished(finishedResult);
            return;
          }

          if (fatal) return;
          console.log("🐱 対局の部屋の接続が切れた。つなぎ直す");
          scheduleRetry();
        },
      });

      // つなぐ途中で、もう要らなくなっていたら、すぐ切る
      if (generationRef.current !== myGen) {
        conn.close();
        return;
      }
      connectionRef.current = conn;
    } catch (e) {
      if (generationRef.current !== myGen) return;
      console.error("対局の部屋につなげなかった:", e);
      scheduleRetry();
    }
  }, [gameId, closeConnection]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled || !gameId) return;

    retryCountRef.current = 0;
    connect();

    return () => {
      generationRef.current += 1; // これ以降に届くものは、全部無視
      closeConnection();
    };
  }, [gameId, enabled, connect, closeConnection]);

  // サーバーへ送る。送れたら true、つながっていなかったら false
  const send = useCallback((msg: object): boolean => {
    const conn = connectionRef.current;
    if (!conn) return false;
    conn.send(msg); // 🌟WSで送ってるところ
    return true;
  }, []);

  // 手動でつなぎ直す(「手の取りこぼし」に気づいたとき用)
  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  return { send, reconnect };
};
