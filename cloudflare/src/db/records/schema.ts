// records/schema.ts
// 棋譜だけを入れる、別のDB(RECORDS_DB)のテーブル。
// 大きくなるので、メインのDBから分けている。
// ※ 別のDBなので、profilesなどへの外部キーは付けられない(もともと付けていない)。
// ※ フォルダを分けているのは、メインの drizzle.config.ts の
//    「*-schema.ts」に拾われないようにするため。

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 棋譜(1局につき1行)。黒の人も白の人も、同じ行を見る。
// 棋譜の一覧は、見られる人の上限(Guest/Start/Premium)の分だけ取ってくる。
// 退会した人がいても、相手の棋譜は残したいので、外部キーは付けない。
export const records = sqliteTable(
  "records",
  {
    gameId: text("game_id").primaryKey(),
    blackUid: text("black_uid").notNull(),
    whiteUid: text("white_uid").notNull(),
    boardSize: integer("board_size").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    result: text("result").notNull(),
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