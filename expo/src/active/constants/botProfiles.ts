// botProfiles.ts
//
// ─── このファイルの責務 ───────────────────────────────
// bot1/bot2/bot3の「対局相手としてのプロフィール」を固定値として持つ。
// icon_indexとratingはdev/prod間で完全に一致しているため共通データとして
// 持ち、uidだけがSupabaseプロジェクトごとに異なるので別テーブルに分離。
// getBotProfile()がその2つを合成して1つのプロフィールを返す。
// ──────────────────────────────────────────────────

import { ModelId } from "expo-katago";
import { BoardSize } from "go-core";

export type BotUsername = "bot1" | "bot2" | "bot3";
export const BOT_USERNAMES: BotUsername[] = ["bot1", "bot2", "bot3"];

// bot名 → 使用モデルの対応。
export const BOT_MODEL_ID: Record<BotUsername, ModelId> = {
  bot1: "b6",
  bot2: "b10",
  bot3: "b18",
};

type BotStats = {
  iconIndex: number;
  ratingByBoardSize: Partial<Record<BoardSize, number>>;
};

// 🐱 env非依存: icon_index・ratingはdev/prodで完全に一致している
export const BOT_STATS: Record<BotUsername, BotStats> = {
  bot1: {
    iconIndex: 100,
    ratingByBoardSize: { 9: 2100, 13: 2100, 19: 1500 },
  },
  bot2: {
    iconIndex: 101,
    ratingByBoardSize: { 9: 2300, 13: 2300, 19: 1900 },
  },
  bot3: {
    iconIndex: 102,
    ratingByBoardSize: { 9: 2500, 13: 2500, 19: 2500 },
  },
};

// 🐱 env依存: uidだけがプロジェクトごとに異なる
const BOT_UIDS: Record<"dev" | "prod", Record<BotUsername, string>> = {
  dev: {
    bot1: "f370ad48-afa8-4fe1-bfd4-cf101858fb23",
    bot2: "7edcfa8d-1e5d-4d3e-9e1b-ade131471b25",
    bot3: "e74a87e8-7734-4c9a-a8d6-7ee0a95c6958",
  },
  prod: {
    bot1: "db78694c-b15f-4ce4-ab81-0a75076d0d22",
    bot2: "81448165-d42e-4a2b-bbdf-7fdf10d15361",
    bot3: "aace3bb0-e959-4f9c-aecd-842443c62b46",
  },
};

const DEV_PROJECT_REF = "ybj";
const PROD_PROJECT_REF = "dwl";

function getEnv(): "dev" | "prod" {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  if (url.includes(PROD_PROJECT_REF)) return "prod";
  if (url.includes(DEV_PROJECT_REF)) return "dev";
  console.warn(
    `[botProfiles] EXPO_PUBLIC_SUPABASE_URLが既知のprojectと一致しません(devとして扱います): ${url}`,
  );
  return "dev";
}

export type BotProfile = {
  username: BotUsername;
  uid: string;
  iconIndex: number;
  rating: number;
};

export function getBotProfile(
  username: BotUsername,
  boardSize: BoardSize,
): BotProfile {
  const stats = BOT_STATS[username];
  return {
    username,
    uid: BOT_UIDS[getEnv()][username],
    iconIndex: stats.iconIndex,
    rating: stats.ratingByBoardSize[boardSize] ?? 0,
  };
}
