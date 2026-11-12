// records/schema.ts
// RECORDS_DB: 棋譜用DB。

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 棋譜(1局につき1行)。黒の人も白の人も、同じ行を見る。
// 棋譜の一覧は、見られる人の上限(Start/Premium)の分だけ取ってくる。
// 退会した人がいても、相手の棋譜は残したいので、外部キーは付けない。
export const records = sqliteTable(
  "records",
  {
    gameId: text("game_id").primaryKey(), // matchのuid
    blackUid: text("black_uid").notNull(), // 黒プレイヤのuid
    whiteUid: text("white_uid").notNull(), // 白プレイヤのuid
    boardSize: integer("board_size").notNull(), // 盤面サイズ
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), // 読めないやつ
    result: text("result").notNull(), // "B+2.5"のような結果
    blackRating: integer("black_rating").notNull(), // 対局前の、黒のレーティング
    whiteRating: integer("white_rating").notNull(), // 対局前の、白のレーティング
    matchType: integer("match_type").notNull(),
    // 手(例: [72, 40, ...])。JSONの文字として入れる
    moves: text("moves", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    // 最終局面の地(無ければ null)
    finalOwnership: text("final_ownership"),
  },
  // インデックスをテーブルに貼ってる。「この人の、この盤面サイズの、新しい順」みたいに取り出すのに役に立つ
  (table) => [
    // 黒の人の一覧(この盤面の、新しい順)を速く引く索引
    index("records_black_idx").on(
      table.blackUid,
      table.boardSize,
      table.createdAt,
    ),
    // 白の人の一覧を速く引く索引
    index("records_white_idx").on(
      table.whiteUid,
      table.boardSize,
      table.createdAt,
    ),
  ],
);