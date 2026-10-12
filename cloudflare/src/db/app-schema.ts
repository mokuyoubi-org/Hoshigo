// app-schema.ts

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

// プロフィール(ボットも含む)。Better Authのuserと、1対1でつながる。
// userが消えたら、プロフィールもいっしょに消える。
export const profiles = sqliteTable("profiles", {
  uid: text("uid")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // 同じ名前の人が2人いないように、重複を禁止する
  username: text("username").notNull().unique(),
  iconIndex: integer("icon_index").notNull().default(0),
  country: text("country"),
  isBot: integer("is_bot", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  lastSeen: integer("last_seen", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// 盤面(9・13・19)ごとの設定。いまは「ボットとの対局を許可するか」だけ。
// プロフィールが消えたら、いっしょに消える。
export const userSettings = sqliteTable(
  "user_settings",
  {
    uid: text("uid")
      .notNull()
      .references(() => profiles.uid, { onDelete: "cascade" }),
    boardSize: integer("board_size").notNull(),
    allowBotMatch: integer("allow_bot_match", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => [primaryKey({ columns: [table.uid, table.boardSize] })],
);

// 盤面ごとの成績(レーティング、勝敗、連勝、1日の対局数など)。
// プロフィールが消えたら、いっしょに消える。
export const userStats = sqliteTable(
  "user_stats",
  {
    uid: text("uid")
      .notNull()
      .references(() => profiles.uid, { onDelete: "cascade" }),
    boardSize: integer("board_size").notNull(),
    rating: integer("rating").notNull().default(0),
    giantKillingStreak: integer("giant_killing_streak").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    highestRating: integer("highest_rating").notNull().default(0),
    winStreak: integer("win_streak").notNull().default(0),
    dailyPlayCount: integer("daily_play_count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.uid, table.boardSize] })],
);

// アプリ全体の状態(メンテナンス中か、必要なバージョンなど)。1行だけ使う。
export const appStatus = sqliteTable("app_status", {
  id: integer("id").primaryKey(),
  maintenance: integer("maintenance", { mode: "boolean" })
    .notNull()
    .default(false),
  message: text("message").notNull().default(""),
  appVersion: text("app_version"),
  otaVersion: text("ota_version"),
});


// 棋譜の「貸出カード」(持ち主ごとの、棋譜の一覧)。
// 棋譜の本体は、R2の records/{gameId}.json にある。ボットには作らない。
// プロフィールが消えたら、いっしょに消える。
export const recordCards = sqliteTable(
  "record_cards",
  {
    uid: text("uid")
      .notNull()
      .references(() => profiles.uid, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    boardSize: integer("board_size").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    color: text("color").notNull(), // 自分の色: "black" か "white"
    oppUid: text("opp_uid").notNull(), // 相手(相手が退会しても、そのまま残る)
    result: text("result").notNull(),
    rating: integer("rating").notNull(), // 対局前の、自分のレーティング
    oppRating: integer("opp_rating").notNull(), // 対局前の、相手のレーティング
    matchType: integer("match_type").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.uid, table.gameId] }),
    // 一覧(自分の、この盤面の、新しい順)を、速く引くための索引
    index("record_cards_list_idx").on(
      table.uid,
      table.boardSize,
      table.createdAt,
    ),
  ],
);

// 対局中の人の目印(1人につき、同時に1局まで)。
// アプリを閉じて、開き直したときに、続きから再開するため。
// ボットには作らない。対局が終わると消える。プロフィールが消えたら、いっしょに消える。
export const activeGames = sqliteTable(
  "active_games",
  {
    uid: text("uid")
      .primaryKey()
      .references(() => profiles.uid, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    boardSize: integer("board_size").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("active_games_game_idx").on(table.gameId)],
);