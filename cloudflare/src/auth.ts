// auth.ts

import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, captcha, emailOTP } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/auth-schema";
import { buildOtpEmail, type Locale } from "./email";

export type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY: string;
  MAIL_FROM: string;
  TURNSTILE_SECRET: string;
};

// ResendのAPIで、OTPのメールを送る。文面は、言語別に用意したものを使う。
async function sendOtpEmail(
  env: AuthEnv,
  to: string,
  otp: string,
  locale: Locale,
) {
  const { subject, html } = buildOtpEmail(locale, otp);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

// 本番・手元の開発で使う、認証の本体。リクエストのたびに作る。
// locale は、このリクエストを送ってきたユーザーの言語(メールの言語になる)。
export function createAuth(env: AuthEnv, locale: Locale = "en") {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // アプリ(Expo)からのリクエストを信用する入り口
        // アプリ(Expo)と、Web版からのリクエストを信用する入り口
    trustedOrigins: ["hoshigo://", "https://hoshigo.app", "http://localhost:8081"],
    plugins: [
      // ロボット避け(Turnstile)。ゲストログインとOTP送信にゲートをつける。
      // endpoints を書くと、標準の対象は置き換わる(メール+パスワード用は使わないので、入れない)。
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: env.TURNSTILE_SECRET,
        endpoints: ["/sign-in/anonymous", "/email-otp/send-verification-otp"],
      }),
      // Expoアプリとのやりとりを助ける
      expo(),
      // ゲスト(匿名)ログイン
      anonymous(),
      // メールのOTPログイン(6桁)
      emailOTP({
        otpLength: 6,
        async sendVerificationOTP({ email, otp }) {
          await sendOtpEmail(env, email, otp, locale);
        },
      }),
    ],
  });
}

// Better AuthのCLI(テーブルの形を自動で作る道具)専用。実行時には使われない。
export const auth = createAuth({
  DB: {} as D1Database,
  BETTER_AUTH_SECRET: "cli-only-dummy-secret-not-used-at-runtime-0123456789",
  BETTER_AUTH_URL: "http://localhost:8787",
  RESEND_API_KEY: "cli-only",
  MAIL_FROM: "cli-only",
  TURNSTILE_SECRET: "cli-only",
});