// cloudflare/src/rpc/admin-tsumego.ts
// 管理者アプリ用の窓口。/admin/ 以下に置く。
// 合言葉(ADMIN_SECRET)が設定されていて、ヘッダー x-admin-secret と合うときだけ動く。
// それ以外は、窓口が存在しないふり(404)をする。
// 本番には ADMIN_SECRET を置かないので、本番では、ここは動かない。
//
// 【いまは、入力チェックを外している】
// アプリ側で SourceType や盤面サイズを増やすたびに、サーバーも直すのが面倒なので、
// 送られてきた値を、そのまま保存している。
//
// 【将来、復活させるもの】(ユーザーが問題を提出する形になる前に、必ず戻す)
//   save の中で、次を確認して、ダメなら400(INVALID_ARGUMENT)を返す
//     1. id: あるなら文字であること
//     2. type: schema.ts の TSUMEGO_TYPES のどれかであること
//     3. source: schema.ts の SOURCE_TYPES のどれかであること(SOURCE_TYPES はいまも schema.ts にある)
//     4. status: "draft" か "published" であること
//     5. board_size: 3〜13 の整数であること
//     6. black_stones / white_stones: 整数・盤の中(0 以上 盤面サイズ×盤面サイズ 未満)・重複なし
//        さらに、黒と白が同じ場所にないこと
//     7. graph:
//        - root が文字で、nodes の中にある。局面は1〜2000個
//        - 局面の result は "correct" / "wrong" / なし、comment は文字、next は配列
//        - 線(move)は整数で盤の中、1つの局面から同じ手が2回出ない
//        - 線の行き先(to)の局面がある
//        - ループがなく、全部の局面が root からたどれる
//     8. 公開("published")のときだけ、root から出る線が1本以上あること
//   ※ 前のコードは、git の履歴に残っている(isGridArray / isValidGraph など)
//   ※ 作者(authorId)は、アプリから送らせず、サーバーがログイン情報から入れる

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type {
  SourceType,
  StatusType,
  TsumegoGraph,
  TsumegoType,
} from "../db/tsumego/schema";
import * as tsumegoSchema from "../db/tsumego/schema";
import type { AppEnv } from "../env";

const { tsumego } = tsumegoSchema;

export const adminTsumegoRoutes = new Hono<{ Bindings: AppEnv }>();

// 合言葉の確認(この下の窓口、全部に効く)
adminTsumegoRoutes.use("*", async (c, next) => {
  const secret = c.env.ADMIN_SECRET;
  if (!secret || c.req.header("x-admin-secret") !== secret) {
    return c.text("Not Found", 404);
  }
  await next();
});

// 保存で送られてくる形(中身は確認しない)
type SaveBody = {
  id?: string;
  type: TsumegoType;
  source: SourceType;
  source_no?: number; // 出典内の番号(なければ空)
  status: StatusType;
  board_size: number;
  black_stones: number[];
  white_stones: number[];
  graph: TsumegoGraph;
};

// 詰碁を、全部返す(新しい順)
adminTsumegoRoutes.get("/tsumego/list", async (c) => {
  const db = drizzle(c.env.TSUMEGO_DB, { schema: tsumegoSchema });
  const rows = await db.select().from(tsumego).orderBy(desc(tsumego.createdAt));

  return c.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      source: r.sourceId,
      status: r.status,
      board_size: r.boardSize,
      black_stones: r.blackStones,
      white_stones: r.whiteStones,
      graph: r.graph,
      created_at: r.createdAt.toISOString(),
    })),
  );
});

// 詰碁を保存する。手番は、常に黒番から。
// id なし = 新しく追加 / id あり = 中身を直す
// status = "draft"(下書き) / "published"(公開)
adminTsumegoRoutes.post("/tsumego/save", async (c) => {
  const body = await c.req.json<SaveBody>();

  const publishedAt = body.status === "published" ? new Date() : null;
  const db = drizzle(c.env.TSUMEGO_DB, { schema: tsumegoSchema });

  // 既存の詰碁を直す
  if (body.id !== undefined) {
    const updated = await db
      .update(tsumego)
      .set({
        type: body.type,
        sourceId: body.source,
        status: body.status,
        publishedAt,
        boardSize: body.board_size,
        blackStones: body.black_stones,
        whiteStones: body.white_stones,
        graph: body.graph,
      })
      .where(eq(tsumego.id, body.id))
      .returning({ id: tsumego.id });
    if (updated.length === 0) {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Tsumego not found" } },
        404,
      );
    }
    return c.json({ id: body.id });
  }

  // 新しく追加する
  const newId = crypto.randomUUID();
  await db.insert(tsumego).values({
    id: newId,
    type: body.type,
    sourceId: body.source,
    status: body.status,
    publishedAt,
    boardSize: body.board_size,
    blackStones: body.black_stones,
    whiteStones: body.white_stones,
    graph: body.graph,
    createdAt: new Date(),
  });
  return c.json({ id: newId });
});

// 詰碁を削除する
adminTsumegoRoutes.post("/tsumego/delete", async (c) => {
  const { id } = await c.req.json<{ id: string }>();

  const db = drizzle(c.env.TSUMEGO_DB, { schema: tsumegoSchema });
  await db.delete(tsumego).where(eq(tsumego.id, id));
  return c.json({ id });
});


// 詰碁を、まとめて新しく追加する(取り込みスクリプト用)。id は、サーバーが付ける。
// D1 は1文につき変数が100個までなので、1問ずつの insert を batch で束ねる。
adminTsumegoRoutes.post("/tsumego/save-all", async (c) => {
  const { items } = await c.req.json<{ items: SaveBody[] }>();

  const db = drizzle(c.env.TSUMEGO_DB, { schema: tsumegoSchema });
  const now = new Date();
  const ids = items.map(() => crypto.randomUUID());
  const statements = items.map((body, i) =>
    db.insert(tsumego).values({
      id: ids[i],
      type: body.type,
      sourceId: body.source,
      sourceNo: body.source_no ?? null,
      status: body.status,
      publishedAt: body.status === "published" ? now : null,
      boardSize: body.board_size,
      blackStones: body.black_stones,
      whiteStones: body.white_stones,
      graph: body.graph,
      createdAt: now,
    }),
  );

  // 100問ずつ実行する
  for (let i = 0; i < statements.length; i += 100) {
    const chunk = statements.slice(i, i + 100);
    await db.batch(
      chunk as [(typeof chunk)[number], ...(typeof chunk)[number][]],
    );
  }
  return c.json({ ids });
});