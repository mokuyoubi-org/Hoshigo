// cron.ts

import { and, eq, gt, gte, lt, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { AuthEnv } from "./auth";
import * as appSchema from "./db/app-schema";
import { user } from "./db/auth-schema";

const { profiles, userStats } = appSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

// 時間割(UTC)。wrangler.jsonc の triggers.crons にも、同じ文字列を書く。
export const CRON_DAILY_CLEANUP = "0 0 * * *"; // 日本時間 9:00
export const CRON_DAILY_RESET = "0 5 * * *"; // 日本時間 14:00

// 14日以上使われていないゲストを消す。
// 本物の(メールで登録した)ユーザーと、ボットは、isAnonymous が false なので、消えない。
// userを消すと、プロフィール・設定・成績・セッションも、芋づる式に消える。
async function cleanupOldAnonymousUsers(env: AuthEnv) {
  const db = drizzle(env.DB, { schema: appSchema });
  const cutoff = new Date(Date.now() - 14 * DAY_MS);

  await db.delete(user).where(
    and(
      eq(user.isAnonymous, true),
      // 14日より前に作られていて
      lt(user.createdAt, cutoff),
      // 14日以内にログインしたプロフィールを持っていない
      notInArray(
        user.id,
        db
          .select({ uid: profiles.uid })
          .from(profiles)
          .where(gte(profiles.lastSeen, cutoff)),
      ),
    ),
  );
}

// 1日の対局数を、全員0に戻す
async function resetDailyPlayCount(env: AuthEnv) {
  const db = drizzle(env.DB, { schema: appSchema });
  await db
    .update(userStats)
    .set({ dailyPlayCount: 0 })
    .where(gt(userStats.dailyPlayCount, 0));
}

// 時刻に合わせて、やることを選ぶ
export async function runScheduled(cron: string, env: AuthEnv) {
  if (cron === CRON_DAILY_CLEANUP) {
    await cleanupOldAnonymousUsers(env);
  } else if (cron === CRON_DAILY_RESET) {
    await resetDailyPlayCount(env);
  }
}