// index.ts

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, type AuthEnv } from "./auth";
import { pickLocale } from "./email";

const app = new Hono<{ Bindings: AuthEnv }>();

app.get("/", (c) => c.text("Hello Hono!"));

// ブラウザ(Web版)からのリクエストを許可する「どうぞ」。
// 許可するアドレスは、Web版の本番(hoshigo.app)と、手元のExpo(localhost:8081)。
// credentials: true にするので、origin は「*」にせず、アドレスを1つずつ書く。
app.use(
  "/api/auth/*",
  cors({
    origin: ["https://hoshigo.app", "http://localhost:8081"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-app-language",
      "x-captcha-response",
      "expo-origin",
      "x-skip-oauth-proxy",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    maxAge: 600,
  }),
);

// ログイン関係(Better Auth)は、/api/auth/ 以下を、全部おまかせする。
// アプリが送ってくる言語(x-app-language)を読んで、メールの言語を決める。
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const locale = pickLocale(
    c.req.header("x-app-language") ?? c.req.header("accept-language"),
  );
  return createAuth(c.env, locale).handler(c.req.raw);
});

export default app;