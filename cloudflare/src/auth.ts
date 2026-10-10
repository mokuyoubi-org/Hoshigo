// auth.ts

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, emailOTP } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/auth-schema";

type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

// 本番・手元の開発で使う、認証の本体。リクエストのたびに作る。
export function createAuth(env: AuthEnv) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
      // ゲスト(匿名)ログイン
      anonymous(),
      // メールのOTPログイン(6桁)
      emailOTP({
        otpLength: 6,
        async sendVerificationOTP({ email, otp, type }) {
          // 今は、ターミナルに表示するだけ。あとでResendのメール送信に差し替える。
          console.log(`[OTP] ${type} ${email}: ${otp}`);
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
});
