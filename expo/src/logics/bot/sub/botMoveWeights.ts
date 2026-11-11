// botMoveWeights.ts
// Hoshigo
//
// ─── このファイルの責務 ───────────────────────────────
// 「どのbotが、どの盤サイズの、何手目で、候補手をどんな確率で選ぶか」の表。
// ──────────────────────────────────────────────────

import { BotUsername } from "@/src/constants/botProfiles";
import { BoardSize } from "go-core";

// 何手ごとに行が切り替わるか(1or2手目、3or4手目…なので2手ごと)
const MOVES_PER_BUCKET = 2;

// 同じ行を buckets 回くり返した表を作る
const repeatRow = (row: number[], buckets: number): number[][] =>
  Array.from({ length: buckets }, () => row);

// 盤サイズごとに「何行ぶん(= 手数÷2)」くり返すかを指定して表を作る
const makeTables = (
  row: number[],
  buckets: Record<BoardSize, number>,
): Record<BoardSize, number[][]> => ({
  5: repeatRow(row, buckets[5]),
  9: repeatRow(row, buckets[9]),
  13: repeatRow(row, buckets[13]),
  19: repeatRow(row, buckets[19]),
});

// bot1用: 1, 10, 100, ... , 1000000000
const BOT1_ROW = Array.from({ length: 10 }, (_, i) => 10 ** i);

// bot2用: どの候補も同じ確率(ランダム)
const BOT2_ROW = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];

// bot3用: 序盤だけ少しばらけさせる(1行 = 2手ぶん)。全盤サイズ共通
const BOT3_ROWS = [
  [10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // 1or2手目
  [15, 15, 15, 15, 10, 10, 10, 10, 0, 0], // 3or4手目
  [20, 20, 15, 15, 15, 15, 0, 0, 0, 0], // 5or6手目
  [25, 25, 25, 25, 0, 0, 0, 0, 0, 0], // 7or8手目
  [50, 50, 0, 0, 0, 0, 0, 0, 0, 0], // 9or10手目
  // 以降、最善手
];

const BOT_WEIGHT_TABLES: Record<BotUsername, Record<BoardSize, number[][]>> = {
  // 🌟bot1: めっちゃ弱体化(5路:10手 / 9路:30手 / 13路:100手 / 19路:200手まで。以降、最善手)
  bot1: makeTables(BOT1_ROW, { 5: 5, 9: 15, 13: 50, 19: 100 }),

  // 🌟bot2: 弱体化(5路:10手 / 9路:20手 / 13路:50手 / 19路:100手まで。以降、最善手)
  bot2: makeTables(BOT2_ROW, { 5: 5, 9: 10, 13: 25, 19: 50 }),

  // 🌟bot3: 最強を目指す(全盤サイズ 10手まで。以降、最善手)
  bot3: {
    5: BOT3_ROWS,
    9: BOT3_ROWS,
    13: BOT3_ROWS,
    19: BOT3_ROWS,
  },
};

/**
 * moveNumber(これから打つ手が何手目か、1-indexed)に対応する重みの行を返す。
 * 表の範囲外なら null = 「常に最善手」の合図。
 */
export const getWeightRow = (
  botId: BotUsername,
  boardSize: BoardSize,
  moveNumber: number,
): readonly number[] | null => {
  const bucketIndex = Math.floor((moveNumber - 1) / MOVES_PER_BUCKET);
  if (bucketIndex < 0) return null;
  return BOT_WEIGHT_TABLES[botId][boardSize][bucketIndex] ?? null;
};