// auth.ts

import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, captcha } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import { createLocalJWKSet, jwtVerify } from "jose";
import * as schema from "./db/auth-schema";
import { carryOverGuestProfile } from "./guest-link";

export type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Turnstileのシークレットキー(サイトキーとは別)。ゲスト作成の検証に使う
  TURNSTILE_SECRET: string;
  // devだけ: Appleの公開鍵(JSON)。本番では設定しない
  APPLE_JWKS_DEV?: string;
};
// iOSアプリのBundle ID。Appleのトークンの「宛先」と照らし合わせる
const IOS_BUNDLE_ID = "com.mokuyoubi.hoshigo";

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
      "https://appleid.apple.com",
    ],
    advanced: {
      defaultCookieAttributes: isDevTunnel
        ? { sameSite: "none", secure: true }
        : {},
      // Cloudflare経由なので、本当のIPは cf-connecting-ip ヘッダーに入っている
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    // ゲスト(匿名)の作りすぎを防ぐ。
    // Workerはリクエストごとに作り直されるので、回数はメモリではなくD1に保存する
    rateLimit: {
      enabled: !isDevTunnel, // devは、動作確認のたびに止まらないよう、無効にしている
      storage: "database",
      customRules: {
        // 同じIPから、24時間で5人まで
        "/sign-in/anonymous": { window: 60 * 60 * 24, max: 5 },
        // 何度も呼ばれるので数えない(D1の書き込みを節約)
        "/get-session": false,
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },

      // iPhone標準の「Appleでサインイン」(IDトークン方式)専用
      // auth.ts の createAuth 内: socialProviders.apple ブロック

      // iPhone標準の「Appleでサインイン」(IDトークン方式)専用
      apple: {
        clientId: IOS_BUNDLE_ID,
        clientSecret: "native-only-not-used",
        appBundleIdentifier: IOS_BUNDLE_ID,
        // devだけ: wrangler dev からだと、Appleの鍵の窓口が403になるので、
        // 手元に保存した鍵(.dev.vars の APPLE_JWKS_DEV)で、署名を確かめる。
        // 本番は APPLE_JWKS_DEV が無いので、Better Auth標準の確認が、そのまま働く
        ...(env.APPLE_JWKS_DEV
          ? {
              verifyIdToken: async (token: string) => {
                try {
                  const keys = createLocalJWKSet(
                    JSON.parse(env.APPLE_JWKS_DEV!),
                  );
                  await jwtVerify(token, keys, {
                    issuer: "https://appleid.apple.com",
                    audience: IOS_BUNDLE_ID,
                  });
                  return true;
                } catch (e) {
                  console.error("Apple IDトークンの確認に失敗(dev):", e);
                  return false;
                }
              },
            }
          : {}),
      },
    },
    plugins: [
      // Expoアプリとのやりとりを助ける
      expo(),
      // ゲスト作成のときだけ、Turnstileのトークンをサーバー側で確かめる
      // (トークンが無い・偽物なら、ゲストは作られない)
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: env.TURNSTILE_SECRET,
        endpoints: ["/sign-in/anonymous"],
      }),
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
  TURNSTILE_SECRET: "cli-only",
});
