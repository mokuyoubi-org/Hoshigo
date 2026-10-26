// cloudflare/src/rpc/records.ts

import { and, count, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { createAuth } from "../auth";
import * as appSchema from "../db/app-schema";
import { user } from "../db/auth-schema";
import type { AppEnv } from "../env";
import { parseAnalysis } from "../logic/analysis";
import { gzipText, readGzipJson } from "../logic/gzip";
import { ratingToRankIndex } from "../logic/rating";

const { profiles, records } = appSchema;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const recordsRoutes = new Hono<{ Bindings: AppEnv }>();

// 棋譜の一覧(新しい順)rpc。ログインしていなくても見られる。
// 引数: p_uid(誰の棋譜か)、p_board_size、p_limit、p_before_id(前のページの、最後の棋譜のid)
// 取ってこれる数は、棋譜の持ち主(p_uid)のプランで決まる。
// Premium(期限内)は無制限、ゲスト(匿名)は10件、Start(ログイン済みの無料)は 30 件まで(盤面ごと)。
// キャッシュ: 1ページ目などは、棚の既定で 60秒。続きのページだけ、下で 1年に上書きする。
recordsRoutes.get(
  "/get_records_older",
  cache({
    cacheName: "hoshigo-records",
    cacheControl: "public, max-age=60",
    vary: ["Origin"],
  }),
  async (c) => {
    const uid = c.req.query("p_uid");
    const boardSize = Number(c.req.query("p_board_size"));
    if (!uid || ![9, 13, 19].includes(boardSize)) {
      return c.json(
        { error: { code: "INVALID_ARGUMENT", message: "Invalid argument" } },
        400,
      );
    }
    const limitParam = Number(c.req.query("p_limit"));
    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_LIMIT)
        : DEFAULT_LIMIT;
    const beforeId = c.req.query("p_before_id") ?? null;

    const db = drizzle(c.env.DB, { schema: appSchema });

    // 持ち主のプランから、取ってこれる上限を決める(null = 無制限)
    const [owner] = await db
      .select({ premiumUntil: profiles.premiumUntil })
      .from(profiles)
      .where(eq(profiles.uid, uid));
    // 退会した人の棋譜は、見られない
    if (!owner) return c.json([]);
    const isPremium =
      owner.premiumUntil !== null && owner.premiumUntil.getTime() > Date.now();
    const cap = isPremium ? null : 30; // 🌟
    // この人が、黒でも白でも、この盤面の棋譜
    const mine = and(
      or(eq(records.blackUid, uid), eq(records.whiteUid, uid)),
      eq(records.boardSize, boardSize),
    );

    // 「このidより古いもの」という、続きの目印を作る
    let cursor;
    let pageLimit = limit;
    if (beforeId) {
      const [before] = await db
        .select({ createdAt: records.createdAt })
        .from(records)
        .where(and(mine, eq(records.gameId, beforeId)));
      // 目印のカードが見つからなければ、空っぽを返す(最初のページに戻って、ぐるぐるしないように)
      if (!before) return c.json([]);
      cursor = or(
        lt(records.createdAt, before.createdAt),
        and(
          eq(records.createdAt, before.createdAt),
          lt(records.gameId, beforeId),
        ),
      );

      // 上限があるときは、「もう何枚渡したか」を数えて、残りの枚数までにする
      if (cap !== null) {
        const [{ n }] = await db
          .select({ n: count() })
          .from(records)
          .where(
            and(
              mine,
              or(
                gte(records.createdAt, before.createdAt),
                and(
                  eq(records.createdAt, before.createdAt),
                  gte(records.gameId, beforeId),
                ),
              ),
            ),
          );
        pageLimit = Math.min(limit, cap - n);
        if (pageLimit <= 0) return c.json([]);
      }
    } else if (cap !== null) {
      pageLimit = Math.min(limit, cap);
    }

    // 新しい順に、1ページ分(手と最終局面の地も、この行の中にある)
    const rows = await db
      .select()
      .from(records)
      .where(and(mine, cursor))
      .orderBy(desc(records.createdAt), desc(records.gameId))
      .limit(pageLimit);
    if (rows.length === 0) return c.json([]);

    // 2人の名前とアイコン(退会した人は、見つからないので、null)
    const uids = [...new Set(rows.flatMap((r) => [r.blackUid, r.whiteUid]))];
    const profileRows = await db
      .select({
        uid: profiles.uid,
        username: profiles.username,
        iconIndex: profiles.iconIndex,
      })
      .from(profiles)
      .where(inArray(profiles.uid, uids));
    const profileMap = new Map(profileRows.map((p) => [p.uid, p]));

    const result = rows.map((r) => {
      const black = profileMap.get(r.blackUid);
      const white = profileMap.get(r.whiteUid);

      return {
        id: r.gameId,
        created_at: r.createdAt.toISOString(),
        result: r.result,
        match_type: r.matchType,
        moves: r.moves,
        final_ownership: r.finalOwnership,
        black_points: r.blackRating,
        white_points: r.whiteRating,
        board_size: r.boardSize,
        black_uid: r.blackUid,
        black_username: black?.username ?? null,
        black_icon_index: black?.iconIndex ?? null,
        black_rank_index: ratingToRankIndex(r.blackRating),
        white_uid: r.whiteUid,
        white_username: white?.username ?? null,
        white_icon_index: white?.iconIndex ?? null,
        white_rank_index: ratingToRankIndex(r.whiteRating),
      };
    });

    // 🏷️ 続きのページだけ、1年間使い回してOK(棚も端末も)。
    // ただし、上限で途中までしか渡せなかったページは、上書きしない(棚の既定の60秒のまま)
    // (あとでPremiumになったときに、古い短いページが長く残らないように)
    if (beforeId && pageLimit === limit) {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    }
    return c.json(result);
  },
);
// 1局ぶんの分析(R2の analysis/{gameId}.json.gz の中身の analysis 部分)を、GETで返す。
// ログインしていなくても見られる。
// 終局後の分析は変わらないので、棚にも端末にも1年使い回してもらう(Cache-Control)。
// 分析がまだ無いとき(null)は、後で届くかもしれないので、棚の既定の60秒だけにする。
recordsRoutes.get(
  "/analysis/:gameId",
  cache({
    cacheName: "hoshigo-analysis",
    cacheControl: "public, max-age=60",
    vary: ["Origin"],
  }),
  async (c) => {
    const gameId = c.req.param("gameId");

    const object = await c.env.RECORDS.get(`analysis/${gameId}.json.gz`);
    if (!object) return c.json({ analysis: null });

    const file = await readGzipJson<{ analysis?: unknown }>(object);
    // 🏷️ 誰が見ても同じなので、棚にも端末にも、1年使い回してOK
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return c.json({ analysis: file.analysis ?? null });
  },
);

// 1局ぶんの分析(全部の局面がそろっているもの)を受け取って、R2に書く。
// 対局者でも、棋譜を見ている人でもよい(棋譜ファイルがあれば、終局済みの対局)。
// 先に届いた方だけを、analysis/{gameId}.json.gz に書く。
// (最終局面の地 final_ownership は、結果の提出時に、棋譜へ書かれている)
recordsRoutes.post("/submit_analysis", async (c) => {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json(
      { error: { code: "NOT_AUTHENTICATED", message: "Not authenticated" } },
      401,
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const gameId = body.p_game_id;
  if (typeof gameId !== "string" || gameId.length === 0) {
    return c.json(
      { error: { code: "INVALID_ARGUMENT", message: "Invalid argument" } },
      400,
    );
  }

  // もう届いていたら、何もしない(先に届いた方を使う)
  const analysisKey = `analysis/${gameId}.json.gz`;
  if (await c.env.RECORDS.head(analysisKey)) return c.json({ ok: true });

  // 棋譜を読む(手数と盤面の大きさを調べるため)
  const db = drizzle(c.env.DB, { schema: appSchema });
  const [card] = await db
    .select({ moves: records.moves, boardSize: records.boardSize })
    .from(records)
    .where(eq(records.gameId, gameId));
  if (!card) {
    return c.json(
      { error: { code: "RECORD_NOT_FOUND", message: "Record not found" } },
      404,
    );
  }
  const positions = card.moves.length + 1;

  const analysis = parseAnalysis(body.p_analysis, card.boardSize, positions);
  if (!analysis) {
    return c.json(
      { error: { code: "INVALID_ARGUMENT", message: "Invalid argument" } },
      400,
    );
  }

  await c.env.RECORDS.put(
    analysisKey,
    await gzipText(JSON.stringify({ id: gameId, analysis })),
    {
      httpMetadata: {
        contentType: "application/json",
        contentEncoding: "gzip",
      },
    },
  );
  return c.json({ ok: true });
});
