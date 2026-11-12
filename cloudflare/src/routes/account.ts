// routes/account.ts

import { and, desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono, type Context } from "hono";
import { cache } from "hono/cache";
import * as appSchema from "../db-schema/app-schema";
import { user } from "../db-schema/auth-schema";
import { createAuth } from "../helper/auth/auth";

const { profiles, userStats } = appSchema;

const BOARD_SIZES = [9, 13, 19] as const;

type AppContext = Context<{ Bindings: Env }>;

// ログイン中の人のidを返す。未ログインなら null。
async function getUid(c: AppContext): Promise<string | null> {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  return session?.user.id ?? null;
}

// エラーを、{ error: { code, message } } の形で返す。
function errorResponse(
  c: AppContext,
  status: 400 | 401 | 409,
  code: string,
  message: string,
) {
  return c.json({ error: { code, message } }, status);
}

// 名前に使ってはいけない文字(スペース・制御文字・見えない文字・向きを変える文字など)
const FORBIDDEN_USERNAME_CHARS =
  /[\u0001-\u0020\u007F-\u00A0\u00AD\u115F\u1160\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFE00-\uFE0E\uFEFF\uFFA0\uFFF0-\uFFFF\u{E0000}-\u{E0FFF}]/u;

export const accountRoutes = new Hono<{ Bindings: Env }>();

// アイコンを変える
accountRoutes.post("/update_icon_index", async (c) => {
  const uid = await getUid(c);
  if (!uid) return errorResponse(c, 401, "NOT_AUTHENTICATED", "Not authenticated");

  const body = await c.req.json().catch(() => ({}));
  const iconIndex = body.new_icon_index;
  if (!Number.isInteger(iconIndex)) {
    return errorResponse(c, 400, "INVALID_ICON_INDEX", "Invalid icon index");
  }

  const db = drizzle(c.env.DB, { schema: appSchema });
  await db.update(profiles).set({ iconIndex }).where(eq(profiles.uid, uid));
  return c.json({ ok: true });
});

// ボットとの対局を許可するかを変える
accountRoutes.post("/update_allow_bot_match", async (c) => {
  const uid = await getUid(c);
  if (!uid) return errorResponse(c, 401, "NOT_AUTHENTICATED", "Not authenticated");

  const body = await c.req.json().catch(() => ({}));
  const allow = body.new_allow_bot_match;
  if (typeof allow !== "boolean") {
    return errorResponse(c, 400, "INVALID_ARGUMENT", "Invalid argument");
  }

  const db = drizzle(c.env.DB, { schema: appSchema });
  await db
    .update(profiles)
    .set({ allowBotMatch: allow })
    .where(eq(profiles.uid, uid));
  return c.json({ ok: true });
});

// 名前を変える
accountRoutes.post("/update_username", async (c) => {
  const uid = await getUid(c);
  if (!uid) return errorResponse(c, 401, "NOT_AUTHENTICATED", "Not authenticated");

  const body = await c.req.json().catch(() => ({}));
  if (typeof body.new_username !== "string") {
    return errorResponse(
      c,
      400,
      "INVALID_USERNAME_FORMAT",
      "Invalid username format",
    );
  }

  // ① NFC正規化して揃える ② 見えない絵文字パーツ(FE0F・ZWJ)を取り除く
  const username = body.new_username
    .normalize("NFC")
    .replace(/[\uFE0F\u200D]/g, "");

  if (username === "") {
    return errorResponse(
      c,
      400,
      "INVALID_USERNAME_FORMAT",
      "Invalid username format",
    );
  }
  // 長さ: 12文字まで(絵文字なども、1文字として数える)
  if ([...username].length > 12) {
    return errorResponse(c, 400, "USERNAME_TOO_LONG", "Username too long");
  }
  // 危険な文字が入っていたら、拒否
  if (FORBIDDEN_USERNAME_CHARS.test(username)) {
    return errorResponse(
      c,
      400,
      "INVALID_USERNAME_FORMAT",
      "Invalid username format",
    );
  }

  const db = drizzle(c.env.DB, { schema: appSchema });

  // 他の人が使っていないか確認
  const [taken] = await db
    .select({ uid: profiles.uid })
    .from(profiles)
    .where(and(eq(profiles.username, username), ne(profiles.uid, uid)));
  if (taken) {
    return errorResponse(c, 409, "USERNAME_TAKEN", "Username already taken");
  }

  try {
    await db.update(profiles).set({ username }).where(eq(profiles.uid, uid));
  } catch (e) {
    // 確認と更新のあいだに、他の人に取られたとき(重複禁止の設定が止めてくれる)
    return errorResponse(c, 409, "USERNAME_TAKEN", "Username already taken");
  }
  return c.json({ ok: true });
});

// ランキング(盤面ごとに、ボットを除いた上位30人)。ログインしていなくても見られる。
// 全員同じ結果なので、1時間「作り置き」する。
accountRoutes.get(
  "/get_rankings",
  cache({ cacheName: "hoshigo-rankings", cacheControl: "public, max-age=0" }),
  async (c) => {
    const db = drizzle(c.env.DB, { schema: appSchema });
    console.log("DBに聞きに行った");
    const result: {
      username: string;
      rating: number;
      icon_index: number;
      board_size: number;
      is_premium: boolean;
    }[] = [];

    // 盤面の小さい順(9 → 13 → 19)、各盤面の中は、レーティングの高い順
    for (const boardSize of BOARD_SIZES) {
      const rows = await db
        .select({
          username: profiles.username,
          rating: userStats.rating,
          iconIndex: profiles.iconIndex,
          premiumUntil: profiles.premiumUntil,
        })
        .from(userStats)
        .innerJoin(profiles, eq(profiles.uid, userStats.uid))
        .where(
          and(eq(userStats.boardSize, boardSize), eq(profiles.isBot, false)),
        )
        .orderBy(desc(userStats.rating))
        .limit(30); // 🌟

      for (const r of rows) {
        result.push({
          username: r.username,
          rating: r.rating,
          icon_index: r.iconIndex,
          board_size: boardSize,
          // 期限が今より先ならプレミアム(期限なし=null は false)
          is_premium: !!r.premiumUntil && r.premiumUntil.getTime() > Date.now(),
        });
      }
    }

    return c.json(result);
  },
);

// ボットの名簿(名前・アイコン・盤面ごとのレート)。ログインしていなくても見られる。
// 全員同じ結果で、動きもゆっくりなので、1日「作り置き」する(棚にも端末にも)。
accountRoutes.get(
  "/get_bots",
  cache({
    cacheName: "hoshigo-bots",
    cacheControl: "public, max-age=86400",
    vary: ["Origin"],
  }),
  async (c) => {
    const db = drizzle(c.env.DB, { schema: appSchema });

    const rows = await db
      .select({
        username: profiles.username,
        iconIndex: profiles.iconIndex,
        boardSize: userStats.boardSize,
        rating: userStats.rating,
      })
      .from(userStats)
      .innerJoin(profiles, eq(profiles.uid, userStats.uid))
      .where(eq(profiles.isBot, true));

    // ボットごとに、盤面サイズ → レートの箱にまとめる
    const bots: Record<
      string,
      { icon_index: number; rating_by_board_size: Record<number, number> }
    > = {};
    for (const r of rows) {
      bots[r.username] ??= {
        icon_index: r.iconIndex,
        rating_by_board_size: {},
      };
      bots[r.username].rating_by_board_size[r.boardSize] = r.rating;
    }

    return c.json(bots);
  },
);

// アカウント削除。userを消すと、プロフィール・設定・成績・セッションも、芋づる式に消える。
accountRoutes.post("/delete_user_account", async (c) => {
  const uid = await getUid(c);
  if (!uid) return errorResponse(c, 401, "NOT_AUTHENTICATED", "Not authenticated");

  const db = drizzle(c.env.DB, { schema: appSchema });
  await db.delete(user).where(eq(user.id, uid));
  return c.json({ ok: true });
});
