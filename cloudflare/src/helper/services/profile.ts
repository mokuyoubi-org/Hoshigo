// services/profile.ts
//
// プロフィールの取得・作成。DBを触るので services/ に置く。

import { eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/d1";
import * as appSchema from "../../db/hoshigo/appSchema";

const { profiles, userStats } = appSchema;

const BOARD_SIZES = [9, 13, 19] as const;

type Db = ReturnType<typeof drizzle<typeof appSchema>>;

// 6文字のランダムな名前(16進数)
const randomUsername = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

// プロフィールを取る。なければ、プロフィールと、成績の3行を、まとめて作る。
// 名前がかぶったら、作り直す(最大10回)。同時に2回呼ばれて、先に作られていたら、それを使う。
export const ensureProfile = async (db: Db, uid: string) => {
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
};
