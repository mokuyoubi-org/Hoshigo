// index.ts

import { Hono } from "hono";
import { createAuth } from "./auth";

type AppEnv = {
  Bindings: {
    DB: D1Database;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
  };
};

const app = new Hono<AppEnv>();

app.get("/", (c) => c.text("Hello Hono!"));

// ログイン関係(Better Auth)は、/api/auth/ 以下を、全部おまかせする
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

export default app;