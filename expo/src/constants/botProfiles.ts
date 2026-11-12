// Hoshigo
// botProfiles.ts
//
// ─── このファイルの責務 ───────────────────────────────
// bot1/bot2/bot3の「対局相手としてのプロフィール」を持つ。
// 本物の値は、サーバーの get_bots が持っている(ボットのレートは動くため)。
// 下の BOT_STATS は「予備」で、サーバーから届くと、中身が上書きされる。
// 届く前や、通信に失敗したときは、予備の値のまま動く。
// ──────────────────────────────────────────────────

import { BoardSize } from "go-core";
import { api } from "@/src/services/api/api";

export type BotUsername = "bot1" | "bot2" | "bot3";
export const BOT_USERNAMES: BotUsername[] = ["bot1", "bot2", "bot3"];

type BotStats = {
  iconIndex: number;
  ratingByBoardSize: Partial<Record<BoardSize, number>>;
};

export const BOT_STATS: Record<BotUsername, BotStats> = {
  bot1: {
    iconIndex: 100,
    ratingByBoardSize: { 9: 2100, 13: 1700, 19: 1300 },
  },
  bot2: {
    iconIndex: 101,
    ratingByBoardSize: { 9: 2300, 13: 2100, 19: 1900 },
  },
  bot3: {
    iconIndex: 102,
    ratingByBoardSize: { 9: 2500, 13: 2500, 19: 2500 },
  },
};

// サーバーが返す形
type BotsResponse = Record<
  string,
  { icon_index: number; rating_by_board_size: Record<string, number> }
>;

// サーバーから名簿を取ってきて、BOT_STATS を書き換える。
// 失敗したら、何もしない(予備の値のまま)。
// 1日の「作り置き」は、サーバーの Cache-Control が受け持つ。
const loadBotStats = async (): Promise<void> => {
  try {
    const { data } = await api.get("get_bots");
    if (!data) return;

    const bots = data as BotsResponse;
    for (const username of BOT_USERNAMES) {
      const bot = bots[username];
      if (!bot) continue;

      const ratingByBoardSize: Partial<Record<BoardSize, number>> = {};
      for (const [size, rating] of Object.entries(bot.rating_by_board_size)) {
        ratingByBoardSize[Number(size) as BoardSize] = rating;
      }
      BOT_STATS[username] = { iconIndex: bot.icon_index, ratingByBoardSize };
    }
  } catch {
    // 通信に失敗したら、予備の値のまま
  }
};

// このファイルが最初に読み込まれたときに、1回だけ取りに行く
loadBotStats();

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