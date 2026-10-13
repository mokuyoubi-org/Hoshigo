// ws.ts
//
// サーバーとの「つなぎっぱなしのトランシーバー📻」を作る部品。
// api.ts が「電話をかけて切る」なら、こちらは「ずっとつなぐ」。
// やること:
//  1. URLの組み立て(?v=アプリのバージョン&ota=OTAのバージョン)
//  2. スマホだけ、cookieを手で渡す(Webはブラウザが自動で持ち歩く)
//  3. 20秒ごとに文字列 "ping" を送る(サーバーが自動で "pong" を返す)
//  4. サーバーが送ってきたエラーのうち、メンテナンス・バージョン不足は、アプリに知らせる

import { OTA_VERSION } from "@/ota-version";
import { appVersion, notifyIfSpecialError } from "@/src/services/api/api";
import { authClient } from "@/src/services/auth/auth-client";
import { Platform } from "react-native";

// http → ws、https → wss に変える
const WS_URL = process.env.EXPO_PUBLIC_API_URL!.replace(/^http/, "ws");
const PING_INTERVAL_MS = 20_000;

// サーバーから届くメッセージ。type で種類がわかる(例: "matched", "move")
export type WsMessage = { type: string; [key: string]: any };

export type WsCloseInfo = {
  code: number;
  reason: string;
  /** 自分(アプリ側)から閉じたなら true */
  byClient: boolean;
};

export type WsHandlers = {
  onMessage: (msg: WsMessage) => void;
  onClose?: (info: WsCloseInfo) => void;
};

export type WsConnection = {
  send: (msg: object) => void;
  close: () => void;
};

// RN の WebSocket は、第3引数でヘッダーを付けられるが、型の定義には無い。
// なので、型を教えてあげる。
type WebSocketWithHeaders = new (
  url: string,
  protocols?: string | string[] | null,
  options?: { headers?: Record<string, string> },
) => WebSocket;

/**
 * つなぐ。つながったら、WsConnection を返す。
 * つなぐのに失敗したら、例外を投げる。
 * 例: connectWs("/ws/queue/9", { onMessage, onClose })
 */
export const connectWs = async (
  path: string,
  handlers: WsHandlers,
): Promise<WsConnection> => {
  // WebSocketにはヘッダーを付けられない(Web版)ので、バージョンはURLに入れる
  const url =
    `${WS_URL}${path}` +
    `?v=${encodeURIComponent(appVersion)}&ota=${encodeURIComponent(OTA_VERSION)}`;

  let ws: WebSocket;
  if (Platform.OS === "web") {
    // cookieは、ブラウザが自動で付ける。Webでは getCookie() を呼ばない
    ws = new WebSocket(url);
  } else {
    const cookie = await authClient.getCookie();
    const WebSocketWithHeaders = WebSocket as unknown as WebSocketWithHeaders;
    ws = new WebSocketWithHeaders(url, undefined, {
      headers: cookie ? { Cookie: cookie } : {},
    });
  }

  let byClient = false;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stopPing = () => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  return new Promise<WsConnection>((resolve, reject) => {
    let opened = false;

    ws.onopen = () => {
      opened = true;
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, PING_INTERVAL_MS);

      resolve({
        send: (msg) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
        },
        close: () => {
          byClient = true;
          stopPing();
          ws.close(1000, "client closed");
        },
      });
    };

    ws.onmessage = (event) => {
      // 自動応答の "pong" は、アプリには見せない
      if (event.data === "pong") return;

      let msg: WsMessage;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }

      // メンテナンス・バージョン不足は、api.ts と同じやり方で、アプリに知らせる
      if (msg?.type === "error" && msg.error) {
        notifyIfSpecialError(msg.error);
      }

      handlers.onMessage(msg);
    };

    ws.onerror = () => {
      if (!opened) reject(new Error("WebSocketにつなげなかった"));
    };

    ws.onclose = (event) => {
      stopPing();
      if (!opened) {
        reject(new Error("WebSocketにつなげなかった"));
        return;
      }
      handlers.onClose?.({
        code: event.code,
        reason: event.reason,
        byClient,
      });
    };
  });
};
