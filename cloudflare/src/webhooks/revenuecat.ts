// revenuecat.ts
//
// RevenueCatからの通知(購入・更新・解約など)を受けて、profiles.premium_until を書き換える。
// 期限(expiration_at_ms)をそのまま書くだけなので、通知の種類で分けない:
//   購入・更新   → 期限が先に延びる
//   解約         → 期限は、いまの期間の終わりのまま(それまでは、プレミアム)
//   期限切れ     → 期限が過去になる(プレミアムが切れる)

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as appSchema from "../db/app-schema";
import type { AppEnv } from "../env";

const { profiles } = appSchema;

// RevenueCatで作った会員証の名前
const PREMIUM_ENTITLEMENT = "premium";

export const revenuecatWebhookRoutes = new Hono<{ Bindings: AppEnv }>();

revenuecatWebhookRoutes.post("/revenuecat", async (c) => {
  // 合言葉が違えば、断る
  if (c.req.header("Authorization") !== c.env.REVENUECAT_WEBHOOK_AUTH) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const event = body?.event;

  // 関係のない通知(テスト、ユーザーの引っ越しなど)は、何もせず「受け取ったよ」と返す。
  // (エラーを返すと、RevenueCatが何度も送り直してくるため)
  if (
    !event ||
    typeof event.app_user_id !== "string" ||
    !Array.isArray(event.entitlement_ids) ||
    !event.entitlement_ids.includes(PREMIUM_ENTITLEMENT) ||
    typeof event.expiration_at_ms !== "number"
  ) {
    return c.json({ ok: true });
  }

  const db = drizzle(c.env.DB, { schema: appSchema });
  await db
    .update(profiles)
    .set({ premiumUntil: new Date(event.expiration_at_ms) })
    .where(eq(profiles.uid, event.app_user_id));

  return c.json({ ok: true });
});