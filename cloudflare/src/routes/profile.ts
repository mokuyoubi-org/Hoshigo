// routes/profile.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as appSchema from "../db/hoshigo/appSchema";
import { createAuth } from "../helper/auth/auth";
import { ensureProfile } from "../helper/services/profile";

const { userStats } = appSchema;

const BOARD_SIZES = [9, 13, 19] as const;

export const profileRoutes = new Hono<{ Bindings: Env }>();

profileRoutes.post("/get_my_profile", async (c) => {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  // 未ログインなら、profile は null
  if (!session) return c.json({ profile: null });

  const db = drizzle(c.env.DB, { schema: appSchema });
  const row = await ensureProfile(db, session.user.id);

  const stats = await db
    .select()
    .from(userStats)
    .where(eq(userStats.uid, row.uid));

  // 盤面(9・13・19)ごとの成績を、盤面サイズをキーにした箱へ入れる
  const boardStats: Record<number, Record<string, unknown>> = {};
  for (const size of BOARD_SIZES) {
    const s = stats.find((x) => x.boardSize === size);
    boardStats[size] = {
      wins: s?.wins ?? 0,
      losses: s?.losses ?? 0,
      draws: s?.draws ?? 0,
      rating: s?.rating ?? 0,
      // giant_killing_streak: s?.giantKillingStreak ?? 0,
    };
  }

  const profile: Record<string, unknown> = {
    uid: row.uid,
    username: row.username,
    icon_index: row.iconIndex,
    allow_bot_match: row.allowBotMatch,
    premium_until: row.premiumUntil ? row.premiumUntil.getTime() : null,
    is_premium: !!row.premiumUntil && row.premiumUntil.getTime() > Date.now(),
    stats: boardStats,
  };

  return c.json({ profile });
});
