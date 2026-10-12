// guest-link.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as appSchema from "./db/app-schema";

const { profiles, userSettings, userStats } = appSchema;

// ゲストが、メールでログインしたときに呼ばれる。
// ・すでにプロフィールがある人(= すでにアカウントを持っているメール)なら、何もしない(ゲストの記録は捨てる)
// ・はじめての人なら、ゲストのプロフィールと成績を、新しいuserに引き継ぐ
export async function carryOverGuestProfile(
  d1: D1Database,
  guestUid: string,
  newUid: string,
) {
  const db = drizzle(d1, { schema: appSchema });

  // 新しい側に、すでにプロフィールがあれば、ゲストの記録は捨てる(A案)
  const [existing] = await db
    .select({ uid: profiles.uid })
    .from(profiles)
    .where(eq(profiles.uid, newUid));
  if (existing) return;

  // ゲストにプロフィールがなければ(まだ get_my_profile を呼んでいなければ)、引き継ぐものがない
  const [guest] = await db.select().from(profiles).where(eq(profiles.uid, guestUid));
  if (!guest) return;

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.uid, guestUid));
  const stats = await db.select().from(userStats).where(eq(userStats.uid, guestUid));

  // 1回のbatchは、全部成功するか、全部なかったことになる。
  // 先にゲストのプロフィールを消す(設定と成績も、いっしょに消える)ので、
  // 同じ名前(username)で、新しい側に作り直せる。
  await db.batch([
    db.delete(profiles).where(eq(profiles.uid, guestUid)),
    db.insert(profiles).values({ ...guest, uid: newUid }),
    db.insert(userSettings).values(settings.map((s) => ({ ...s, uid: newUid }))),
    db.insert(userStats).values(stats.map((s) => ({ ...s, uid: newUid }))),
  ]);
}