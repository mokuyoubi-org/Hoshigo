// app-schema.ts
// DBのテーブルをここで定義している。

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
  isBot: integer("is_bot", { mode: "boolean" }).notNull().default(false),
  // ボットとの対局を許可するか(盤面に関係なく、1つ)
  allowBotMatch: integer("allow_bot_match", { mode: "boolean" })
    .notNull()
    .default(true),
  // プレミアムの期限。空(null)なら、プレミアムではない。
  // 期限が過ぎれば、自動でプレミアムが切れる(通知を取りこぼしても安心)
  premiumUntil: integer("premium_until", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  lastSeen: integer("last_seen", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

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
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    highestRating: integer("highest_rating").notNull().default(0),
    winStreak: integer("win_streak").notNull().default(0),
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
