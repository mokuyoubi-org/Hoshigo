import { Hono } from "hono";
import { createAuth, type AuthEnv } from "./auth";
import { pickLocale } from "./email";

const app = new Hono<{ Bindings: AuthEnv }>();

app.get("/", (c) => c.text("Hello Hono!"));

// ログイン関係(Better Auth)は、/api/auth/ 以下を、全部おまかせする。
// アプリが送ってくる言語(x-app-language)を読んで、メールの言語を決める。
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const locale = pickLocale(
    c.req.header("x-app-language") ?? c.req.header("accept-language"),
  );
  return createAuth(c.env, locale).handler(c.req.raw);
});

export default app;