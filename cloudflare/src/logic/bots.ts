// bots.ts

import { ratingToRankIndex } from "./rating";

// ボットの対戦表。
// 盤面ごとに、ランク(0 = 10k 〜 17 = 8D)の行があって、
// [bot1, bot2, bot3] の match_type が入っている。null は、そのランクには出ないボット。
// match_type: 0 = 互先(白黒ランダム)、1 = コミ落ち、2以上 = 置き石の数(25 は 25子)
type BotRow = readonly [number | null, number | null, number | null];

const BOT_TABLE: Record<number, readonly BotRow[]> = {
  9: [
    [5, 5, 5],
    [4, 5, 5],
    [4, 4, 5],
    [4, 4, 4],
    [3, 4, 4],
    [3, 3, 4],
    [3, 3, 3],
    [2, 3, 3],
    [2, 2, 3],
    [2, 2, 2],
    [1, 2, 2],
    [1, 1, 2],
    [1, 1, 1],
    [0, 1, 1],
    [0, 0, 1],
    [0, 0, 0],
    [null, 0, 0],
    [null, null, 0],
  ],
  13: [
    [9, 9, 9],
    [8, 8, 8],
    [7, 7, 7],
    [6, 6, 7],
    [5, 6, 6],
    [5, 5, 6],
    [4, 5, 5],
    [4, 4, 5],
    [3, 4, 4],
    [3, 3, 4],
    [2, 3, 3],
    [2, 2, 3],
    [1, 2, 2],
    [1, 1, 2],
    [0, 1, 1],
    [0, 0, 1],
    [null, 0, 0],
    [null, null, 0],
  ],
  19: [
    [25, 25, 25],
    [16, 25, 25],
    [13, 16, 25],
    [9, 16, 16],
    [8, 13, 16],
    [7, 9, 13],
    [6, 8, 13],
    [5, 7, 9],
    [4, 6, 9],
    [3, 5, 8],
    [2, 4, 7],
    [1, 3, 6],
    [0, 2, 5],
    [null, 1, 4],
    [null, 0, 3],
    [null, null, 2],
    [null, null, 1],
    [null, null, 0],
  ],
};

// レーティングに合ったボットを、ランダムに1つ選ぶ。いなければ null。
export function pickBot(
  rating: number,
  boardSize: number,
): { botName: string; matchType: number } | null {
  const rows = BOT_TABLE[boardSize];
  if (!rows) return null;

  const row = rows[ratingToRankIndex(rating)];
  if (!row) return null;

  const candidates: { botName: string; matchType: number }[] = [];
  row.forEach((matchType, i) => {
    if (matchType !== null) {
      candidates.push({ botName: `bot${i + 1}`, matchType });
    }
  });
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}