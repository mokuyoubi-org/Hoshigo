// botLogics.ts

import { BOT_STATS, BotUsername } from "@/src/active/constants/botProfiles";
import { BoardSize } from "go-core";

export function isBot(username: string): username is BotUsername {
  return ["bot1", "bot2", "bot3"].includes(username);
}

// 🌟 bot1/2/3のレーティングは botProfiles.ts の BOT_STATS を単一の情報源とする。
// (以前はここに数値を手打ちで複製しており、bot3の19路盤だけ値がズレていた)
export const getRatingFromName = (
  name: string,
  boardSize: BoardSize,
): number => {
  if (!isBot(name)) return 0;
  return BOT_STATS[name].ratingByBoardSize[boardSize] ?? 0;
};