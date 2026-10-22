// cloudflare/src/rpc/records.ts

import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createAuth } from "../auth";
import * as appSchema from "../db/app-schema";
import type { AppEnv } from "../env";
import { parseAnalysis } from "../logic/analysis";
import { gzipText, readGzipJson } from "../logic/gzip";
import { ratingToRankIndex } from "../logic/rating";

const { profiles, recordCards } = appSchema;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const recordsRoutes = new Hono<{ Bindings: AppEnv }>();

// 棋譜の一覧(新しい順)rpc
// 引数: p_uid(誰の棋譜か)、p_board_size、p_limit、p_before_id(前のページの、最後の棋譜のid)
// p_before_id がある(=続きのページ)ときだけ、端末に使い回してもらう
recordsRoutes.get("/get_records_older", async (c) => {
  // ログインしている人だけ(他の人の棋譜も、見られる)
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json(
      { error: { code: "NOT_AUTHENTICATED", message: "Not authenticated" } },
      401,
    );
  }

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

  // 「このidより古いもの」という、続きの目印を作る
  let cursor;
  if (beforeId) {
    const [before] = await db
      .select({ createdAt: recordCards.createdAt })
      .from(recordCards)
      .where(and(eq(recordCards.uid, uid), eq(recordCards.gameId, beforeId)));
    // 目印のカードが見つからなければ、空っぽを返す(最初のページに戻って、ぐるぐるしないように)
    if (!before) return c.json([]);
    cursor = or(
      lt(recordCards.createdAt, before.createdAt),
      and(
        eq(recordCards.createdAt, before.createdAt),
        lt(recordCards.gameId, beforeId),
      ),
    );
  }

  // カードから、新しい順に、1ページ分(手と最終局面の地も、カードの中にある)
  const cards = await db
    .select()
    .from(recordCards)
    .where(
      and(
        eq(recordCards.uid, uid),
        eq(recordCards.boardSize, boardSize),
        cursor,
      ),
    )
    .orderBy(desc(recordCards.createdAt), desc(recordCards.gameId))
    .limit(limit);
  if (cards.length === 0) return c.json([]);

  // 2人の名前とアイコン(退会した人は、見つからないので、null)
  const uids = [...new Set(cards.flatMap((card) => [card.uid, card.oppUid]))];
  const profileRows = await db
    .select({
      uid: profiles.uid,
      username: profiles.username,
      iconIndex: profiles.iconIndex,
    })
    .from(profiles)
    .where(inArray(profiles.uid, uids));
  const profileMap = new Map(profileRows.map((p) => [p.uid, p]));

  const rows = cards.map((card) => {
    // カードは「自分から見た」形なので、黒・白に直す
    const isBlack = card.color === "black";
    const blackUid = isBlack ? card.uid : card.oppUid;
    const whiteUid = isBlack ? card.oppUid : card.uid;
    const blackRating = isBlack ? card.rating : card.oppRating;
    const whiteRating = isBlack ? card.oppRating : card.rating;
    const black = profileMap.get(blackUid);
    const white = profileMap.get(whiteUid);

    return {
      id: card.gameId,
      created_at: card.createdAt.toISOString(),
      result: card.result,
      match_type: card.matchType,
      moves: card.moves,
      final_ownership: card.finalOwnership,
      black_points: blackRating,
      white_points: whiteRating,
      board_size: card.boardSize,
      black_uid: blackUid,
      black_username: black?.username ?? null,
      black_icon_index: black?.iconIndex ?? null,
      black_rank_index: ratingToRankIndex(blackRating),
      white_uid: whiteUid,
      white_username: white?.username ?? null,
      white_icon_index: white?.iconIndex ?? null,
      white_rank_index: ratingToRankIndex(whiteRating),
    };
  });

  // 🏷️ 続きのページだけ、1年間使い回してOK
  if (beforeId) {
    c.header("Cache-Control", "private, max-age=31536000, immutable");
  }
  return c.json(rows);
});

// 1局ぶんの分析(R2の analysis/{gameId}.json.gz の中身の analysis 部分)を、GETで返す。
// 終局後の分析は変わらないので、端末に使い回してもらう(Cache-Control)。
// 分析がまだ無いとき(null)は、後で届くかもしれないので、使い回させない。
// 有料化するときは、ここに「有料の人だけ」の確認を足す。
recordsRoutes.get("/analysis/:gameId", async (c) => {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json(
      { error: { code: "NOT_AUTHENTICATED", message: "Not authenticated" } },
      401,
    );
  }

  const gameId = c.req.param("gameId");

  const object = await c.env.RECORDS.get(`analysis/${gameId}.json.gz`);
  if (!object) return c.json({ analysis: null });

  const file = await readGzipJson<{ analysis?: unknown }>(object);
  // 🏷️ 取り扱い注意シール: 本人のスマホだけ、1年間使い回してOK
  c.header("Cache-Control", "private, max-age=31536000, immutable");
  return c.json({ analysis: file.analysis ?? null });
});

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

  // 貸出カードを1枚読む(手数と盤面の大きさを調べるため。2人のカードは同じ中身)
  const db = drizzle(c.env.DB, { schema: appSchema });
  const [card] = await db
    .select({ moves: recordCards.moves, boardSize: recordCards.boardSize })
    .from(recordCards)
    .where(eq(recordCards.gameId, gameId))
    .limit(1);
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
