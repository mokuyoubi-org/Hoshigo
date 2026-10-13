// botProfiles.ts
//
// ─── このファイルの責務 ───────────────────────────────
// bot1/bot2/bot3の「対局相手としてのプロフィール」を固定値として持つ。
// 2026/10/13: Cloudflare版。uid は、サーバー(D1)が持つのでアプリでは持たない。
// ──────────────────────────────────────────────────

import { BoardSize } from "go-core";

export type BotUsername = "bot1" | "bot2" | "bot3";
export const BOT_USERNAMES: BotUsername[] = ["bot1", "bot2", "bot3"];

type BotStats = {
  iconIndex: number;
  ratingByBoardSize: Partial<Record<BoardSize, number>>;
};

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

export type BotProfile = {
  username: BotUsername;
  iconIndex: number;
  rating: number;
};

export const getBotProfile = (
  username: BotUsername,
  boardSize: BoardSize,
): BotProfile => {
  const stats = BOT_STATS[username];
  return {
    username,
    iconIndex: stats.iconIndex,
    rating: stats.ratingByBoardSize[boardSize] ?? 0,
  };
};
