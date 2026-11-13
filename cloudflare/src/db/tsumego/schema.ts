// tsumego/schema.ts
// TSUMEGO_DB: 詰碁用DB。
/*
⚠️⚠️⚠️このページのスキーマを変更した時は
cd ~/Hoshigo/cloudflare
npx drizzle-kit generate --config=drizzle.tsumego.config.ts
npx wrangler d1 migrations apply hoshigo-tsumego --local
を必ず実行すること！⚠️⚠️⚠️
*/

import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// 問題の種類。増やすときは、ここに1行足す。
// "capture" = 石を取ってください / "alive" = 生きてください / "nextMove" = 次の一手は?
export const TSUMEGO_TYPES = ["capture", "alive", "nextMove"] as const;
export type TsumegoType = (typeof TSUMEGO_TYPES)[number];

// 出典(どの本から持ってきた問題か)。増やすときは、ここに1行足す。
// Expo側の SourceType と同じ値にする
export const SOURCE_TYPES = [
  "shinTsumegoKenkyu",
  "kanzufu",
  "gokyoShumyo",
  "gengenGokyo",
  "genran",
  "shikatsuMyoki",
  "igoHatsuyoron",
  "chinrou",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type StatusType = "published" | "draft";

// 解答の状態。"skipped" = 飛ばした / "correct" = 正解 / "wrong" = 不正解
export type StatusOfUser = "skipped" | "correct" | "wrong";

// 局面から出る、1本の線(手)。move は、石の位置を1つの数字にしたもの(棋譜のmovesと同じ形)。
// to = 打ったあとの局面のid
export type TsumegoEdge = {
  move: number;
  to: string;
};

// result があれば、ここで解き終わり("correct" = 正解 / "wrong" = 不正解)。
// 結果は、手順のいちばん最後の局面に付ける。書かなければ、まだ途中
export type TsumegoPosition = {
  result?: "correct" | "wrong";
  // 一言解説(例: 「ここは欠け目になります」)
  comment?: string;
  next: TsumegoEdge[];
};

// 正解・不正解の「地図」。root = 問題図の局面のid。
// 局面から出る「ユーザーの手の候補」と、相手の返しの手が、next でつながる。
// 線にない手は「その他の不正解」として扱う。
// 手番は、常に黒番から。
export type TsumegoGraph = {
  root: string;
  nodes: Record<string, TsumegoPosition>;
};

// 詰碁(1問につき1行)。これは当然必須
export const tsumego = sqliteTable(
  "tsumego",
  {
    id: text("id").primaryKey(), // 詰碁id
    type: text("type").$type<TsumegoType>().notNull(), // 石を取る問題なのか、生きる問題なのか、次の一手問題なのか
    boardSize: integer("board_size").notNull(),
    // 問題図。石の位置の数字を並べたもの(例: [72, 40, ...])
    blackStones: text("black_stones", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    whiteStones: text("white_stones", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    // 正解・不正解の地図
    graph: text("graph", { mode: "json" })
      .$type<TsumegoGraph>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status").$type<StatusType>().notNull().default("draft"), // "published" | "draft"
    sourceId: text("source_id").$type<SourceType>(), // 出典(なければ空)
    sourceNo: integer("source_no"), // 出典内の番号(なければ空)
    variationNo: integer("variation_no").notNull().default(0), // 改題番号(原題は0、改題は1,2,…)
    authorId: text("author_id"), // 作者id(なければ空)
    rating: integer("rating").notNull().default(0), // 詰碁レーティング
    publishedAt: integer("published_at", { mode: "timestamp_ms" }), // 公開日(下書きの間は空)
    solvedCount: integer("solved_count").notNull().default(0), // 累計解かれた回数
    correctCount: integer("correct_count").notNull().default(0), // 累計正解回数
  },
  (table) => [
    // 同じ出典の中で、同じ番号は1つだけ(出典や番号が空のものは、いくつあってもよい)
    uniqueIndex("tsumego_source_no_unique").on(table.sourceId, table.sourceNo),
  ],
);

// ユーザー(1人につき1行)。詰碁での成績だけを持つ。これも必須
export const tsumegoUsers = sqliteTable("tsumego_users", {
  id: text("id").primaryKey(), // ユーザーid
  rating: integer("rating").notNull().default(0), // ユーザーレーティング
  solvedCount: integer("solved_count").notNull().default(0), // 累計解いた回数
  correctCount: integer("correct_count").notNull().default(0), // 累計正解回数
});

// 1人1問の状態(1人1問につき1行まで)。「解いた結果(飛ばした含む)」と「いいね」を持つ。
// status が空 = まだ解いていない(いいねだけ押した状態)
export const tsumegoUserStates = sqliteTable(
  "tsumego_user_states",
  {
    userId: text("user_id").notNull(),
    tsumegoId: text("tsumego_id").notNull(),
    status: text("status").$type<StatusOfUser>(), // 最後に解いた時の結果(なければ空)
    solvedAt: integer("solved_at", { mode: "timestamp_ms" }), // 最後に解いた日時(なければ空)
    liked: integer("liked", { mode: "boolean" }).notNull().default(false), // いいねしたか
  },
  (table) => [primaryKey({ columns: [table.userId, table.tsumegoId] })],
);
