// records.ts

import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createAuth } from "../auth";
import * as appSchema from "../db/app-schema";
import type { AppEnv } from "../env";
import { ratingToRankIndex } from "../logic/rating";

const { profiles, recordCards } = appSchema;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const recordsRoutes = new Hono<{ Bindings: AppEnv }>();

// 棋譜の一覧(新しい順)。いまのSupabaseの get_records_older と、ほぼ同じ形で返す。
// 引数: p_uid(誰の棋譜か)、p_board_size、p_limit、p_before_id(前のページの、最後の棋譜のid)
recordsRoutes.post("/get_records_older", async (c) => {
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

  const body = await c.req.json().catch(() => ({}));
  const uid = body.p_uid;
  const boardSize = body.p_board_size;
  if (typeof uid !== "string" || ![9, 13, 19].includes(boardSize)) {
    return c.json(
      { error: { code: "INVALID_ARGUMENT", message: "Invalid argument" } },
      400,
    );
  }
  const limit = Number.isInteger(body.p_limit)
    ? Math.min(Math.max(body.p_limit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const beforeId: string | null =
    typeof body.p_before_id === "string" ? body.p_before_id : null;

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

  // カード(貸出台帳)から、新しい順に、1ページ分
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

  // 手(moves)は、R2の棋譜ファイルから、まとめて読む
  const movesList = await Promise.all(
    cards.map(async (card) => {
      const object = await c.env.RECORDS.get(`records/${card.gameId}.json`);
      if (!object) return null;
      const record = (await object.json()) as { moves?: number[] };
      return record.moves ?? null;
    }),
  );

  const rows = cards.map((card, i) => {
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
      moves: movesList[i],
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

  return c.json(rows);
});