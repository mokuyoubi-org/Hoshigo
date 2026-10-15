// index.ts

import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { runScheduled } from "./cron";
import type { AppEnv } from "./env";
import { checkGate, guard } from "./middleware/guard";
import { accountRoutes } from "./rpc/account";
import { profileRoutes } from "./rpc/profile";
import { recordsRoutes } from "./rpc/records";

// Durable Objectsの部屋のクラスは、ここから export する(Cloudflareが見つけるため)
export { GameRoom } from "./game-room";
export { QueueRoom } from "./queue-room";

const app = new Hono<{ Bindings: AppEnv }>();

// 許可するアドレス:Web版の本番(hoshigo.app)と、手元のExpo(dev.hoshigo.app / localhost:8081)。
const ALLOWED_ORIGINS = [
  "https://hoshigo.app",
  "https://api.hoshigo.app",
  "https://dev.hoshigo.app",
  "http://localhost:8081",
];

app.get("/", (c) => c.text("Hello Hono!"));

// ブラウザ(Web版)からのリクエストを許可する「どうぞ」。
// credentials: true にするので、origin は「*」にせず、アドレスを1つずつ書く。
const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "x-app-version",
    "x-ota-version",
    "x-captcha-response",
    "expo-origin",
    "x-skip-oauth-proxy",
  ],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  maxAge: 600,
});
app.use("/api/auth/*", corsMiddleware);
app.use("/rpc/*", corsMiddleware);

// ログイン関係(Better Auth)は、/api/auth/ 以下を、全部おまかせする。
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

// RPCは、/rpc/ 以下に置く。
// 入り口に、見張り番(バージョンとメンテナンスの確認)を立てる。
app.use("/rpc/*", guard);

// 本物のRPC。
app.route("/rpc", profileRoutes);
app.route("/rpc", accountRoutes);
app.route("/rpc", recordsRoutes);

// WebSocketで「エラーです」と伝えて、閉じる。
// (WebSocketの失敗は、HTTPのエラーだと、アプリに中身が届かないため)
function rejectWebSocket(code: string, message: string): Response {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();
  server.send(JSON.stringify({ type: "error", error: { code, message } }));
  server.close(1008, code);
  return new Response(null, { status: 101, webSocket: client });
}

// WebSocketの入り口の、共通の確認(アドレス・バージョン・メンテナンス・ログイン)。
// 通れたら、ログインしている人のidを返す。通れなければ、返すべき Response を返す。
// Web版のWebSocketには、ヘッダーが付けられないので、バージョンは URL の ?v= と &ota= で受け取る。
async function checkWebSocketEntry(
  c: Context<{ Bindings: AppEnv }>,
): Promise<{ uid: string; isAnonymous: boolean } | { response: Response }> {
  // 許可していないアドレスのWebページから、勝手につながれないように
  const origin = c.req.header("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    // 手元の開発(wrangler dev)のときだけ、実機のスマホが付ける
    // 「自分のMacのアドレス」のOriginも通す。本番(https)では通さない。
    const isLocalDev =
      new URL(c.req.url).hostname !== "api.hoshigo.app" &&
      c.req.url.startsWith("http://") &&
      origin === new URL(c.req.url).origin;
    if (!isLocalDev) {
      return { response: c.text("Forbidden", 403) };
    }
  }
  if (c.req.header("upgrade") !== "websocket") {
    return { response: c.text("Expected WebSocket", 426) };
  }

  // バージョン・メンテナンスの確認
  const gate = await checkGate(c.env, c.req.query("v"), c.req.query("ota"));
  if (gate) return { response: rejectWebSocket(gate.code, gate.message) };

  // ログインしている人か確認
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return {
      response: rejectWebSocket("NOT_AUTHENTICATED", "Not authenticated"),
    };
  }
  return {
    uid: session.user.id,
    isAnonymous: session.user.isAnonymous === true,
  };
}

// 部屋につなぐ。誰のつながりかを、ヘッダーで部屋に伝える。
// (アプリが送ってきた同名のヘッダーは、上書きされる)
function forwardToRoom(
  stub: { fetch(request: Request): Promise<Response> },
  c: Context<{ Bindings: AppEnv }>,
  uid: string,
  extra: Record<string, string> = {},
): Promise<Response> {
  const headers = new Headers(c.req.raw.headers);
  headers.set("x-user-id", uid);
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value);
  }
  return stub.fetch(new Request(c.req.url, { headers }));
}

// 待機列への入り口。盤面ごとの待機列の部屋(名前は 9 / 13 / 19)につなぐ。
app.get("/ws/queue/:boardSize", async (c) => {
  const boardSize = Number(c.req.param("boardSize"));
  if (![9, 13, 19].includes(boardSize)) {
    return c.text("Invalid board size", 400);
  }

  const entry = await checkWebSocketEntry(c);
  if ("response" in entry) return entry.response;

  const stub = c.env.QUEUE_ROOM.get(
    c.env.QUEUE_ROOM.idFromName(String(boardSize)),
  );
  return forwardToRoom(stub, c, entry.uid, {
    "x-board-size": String(boardSize),
    "x-user-anonymous": entry.isAnonymous ? "1" : "0",
  });
});

// 対局の部屋への入り口。1局ごとの部屋(名前は gameId)につなぐ。
app.get("/ws/game/:gameId", async (c) => {
  const entry = await checkWebSocketEntry(c);
  if ("response" in entry) return entry.response;

  const stub = c.env.GAME_ROOM.get(
    c.env.GAME_ROOM.idFromName(c.req.param("gameId")),
  );
  return forwardToRoom(stub, c, entry.uid);
});

export default {
  // いつものリクエスト(ログイン、RPC、WebSocket)
  fetch: app.fetch,
  // 時間割の時刻に、自動で呼ばれる(Cron Trigger)
  async scheduled(
    controller: ScheduledController,
    env: AppEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(runScheduled(controller.cron, env));
  },
};
