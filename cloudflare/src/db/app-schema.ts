// app-schema.ts

import { sql } from "drizzle-orm";
import {
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
