// profile.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createAuth, type AuthEnv } from "../auth";
import * as appSchema from "../db/app-schema";

const { profiles, userSettings, userStats } = appSchema;

const BOARD_SIZES = [9, 13, 19] as const;

type Db = ReturnType<typeof drizzle<typeof appSchema>>;

// 6文字のランダムな名前(16進数)
function randomUsername(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// プロフィールを取る。なければ、プロフィールと、設定・成績の6行を、まとめて作る。
// 名前がかぶったら、作り直す(最大10回)。同時に2回呼ばれて、先に作られていたら、それを使う。
export async function ensureProfile(db: Db, uid: string) {
  // すでにあれば、最終ログイン(lastSeen)を更新して、それを返す
  const [updated] = await db
    .update(profiles)
    .set({ lastSeen: new Date() })
    .where(eq(profiles.uid, uid))
    .returning();
  if (updated) return updated;

  for (let i = 0; i < 10; i++) {
    try {
      // 1回のbatchは、全部成功するか、全部なかったことになる
      await db.batch([
        db.insert(profiles).values({ uid, username: randomUsername() }),
        db
          .insert(userSettings)
          .values(BOARD_SIZES.map((boardSize) => ({ uid, boardSize }))),
        db
          .insert(userStats)
          .values(BOARD_SIZES.map((boardSize) => ({ uid, boardSize }))),
      ]);
      break;
    } catch (e) {
      // 同時に呼ばれて、先に作られていたら、そこで終わり
      const [already] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.uid, uid));
      if (already) break;
      // そうでなければ、名前がかぶったということなので、別の名前で、もう一度
    }
  }

  const [created] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.uid, uid));
  if (!created) throw new Error("failed_to_generate_unique_username");
  return created;
}

export const profileRoutes = new Hono<{ Bindings: AuthEnv }>();

// rpc
profileRoutes.post("/get_my_profile", async (c) => {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  // 未ログインなら、profile は null
  if (!session) return c.json({ profile: null });

  const db = drizzle(c.env.DB, { schema: appSchema });
  const row = await ensureProfile(db, session.user.id);

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.uid, row.uid));
  const stats = await db
    .select()
    .from(userStats)
    .where(eq(userStats.uid, row.uid));

  const profile: Record<string, unknown> = {
    uid: row.uid,
    username: row.username,
    icon_index: row.iconIndex,
  };

  profile.premium_until = row.premiumUntil ? row.premiumUntil.getTime() : null;
  profile.is_premium =
    !!row.premiumUntil && row.premiumUntil.getTime() > Date.now();

  // 盤面(9・13・19)ごとの、成績と設定
  for (const size of BOARD_SIZES) {
    const s = stats.find((x) => x.boardSize === size);
    const st = settings.find((x) => x.boardSize === size);
    profile[`wins_${size}`] = s?.wins ?? 0;
    profile[`losses_${size}`] = s?.losses ?? 0;
    profile[`draws_${size}`] = s?.draws ?? 0;
    profile[`rating_${size}`] = s?.rating ?? 0;
    profile[`giant_killing_streak_${size}`] = s?.giantKillingStreak ?? 0;
    profile[`allow_bot_match_${size}`] = st?.allowBotMatch ?? true;
  }

  return c.json({ profile });
});
