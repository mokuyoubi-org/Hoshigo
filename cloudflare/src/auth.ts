// auth.ts

import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/auth-schema";
import { carryOverGuestProfile } from "./guest-link";

export type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

// 本番・手元の開発で使う、認証の本体。リクエストのたびに作る。
export function createAuth(env: AuthEnv) {
  const db = drizzle(env.DB, { schema });

  // dev用のトンネル(dev-api.hoshigo.app)のときだけ、
  // Web(localhost:8081)から見て「別サイト」になるので、cookieを別サイトでも通す
  const isDevTunnel = env.BETTER_AUTH_URL.includes("dev-api.");

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // アプリ(Expo)と、Web版からのリクエストを信用する入り口
    trustedOrigins: [
      "hoshigo://",
      "https://hoshigo.app",
      "https://api.hoshigo.app",
      "http://localhost:8081",
    ],
    advanced: {
      defaultCookieAttributes: isDevTunnel
        ? { sameSite: "none", secure: true }
        : {},
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      // Expoアプリとのやりとりを助ける
      expo(),
      // ゲスト(匿名)ログイン
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          try {
            await carryOverGuestProfile(
              env.DB,
              anonymousUser.user.id,
              newUser.user.id,
            );
          } catch (e) {
            // 引き継ぎに失敗しても、ログイン自体は止めない
            console.error("ゲストの引き継ぎに失敗:", e);
          }
        },
      }),
    ],
  });
}

// Better AuthのCLI専用。実行時には使われない。
export const auth = createAuth({
  DB: {} as D1Database,
  BETTER_AUTH_SECRET: "cli-only-dummy-secret-not-used-at-runtime-0123456789",
  BETTER_AUTH_URL: "http://localhost:8787",
  GOOGLE_CLIENT_ID: "cli-only",
  GOOGLE_CLIENT_SECRET: "cli-only",
});