// constants/ranks.ts

import { TranslationKey } from "@/src/i18n/types";
import { BoardSize } from "go-core";

export type Rank = {
  nameKey: TranslationKey;
  color: string;
  minRating: number;
};

export const RANKS: Rank[] = [
  { nameKey: "Rank.tenK", color: "gray", minRating: 0 }, // 0
  { nameKey: "Rank.nineK", color: "gray", minRating: 20 }, // 1
  { nameKey: "Rank.eightK", color: "gray", minRating: 60 }, // 2
  { nameKey: "Rank.sevenK", color: "blue", minRating: 120 }, // 3
  { nameKey: "Rank.sixK", color: "blue", minRating: 200 }, // 4
  { nameKey: "Rank.fiveK", color: "blue", minRating: 300 }, // 5
  { nameKey: "Rank.fourK", color: "green", minRating: 420 }, // 6
  { nameKey: "Rank.threeK", color: "green", minRating: 560 }, // 7
  { nameKey: "Rank.twoK", color: "green", minRating: 720 }, // 8
  { nameKey: "Rank.oneK", color: "yellow", minRating: 900 }, // 9
  { nameKey: "Rank.oneD", color: "yellow", minRating: 1100 }, // 10
  { nameKey: "Rank.twoD", color: "yellow", minRating: 1300 }, // 11
  { nameKey: "Rank.threeD", color: "rose", minRating: 1500 }, // 12
  { nameKey: "Rank.fourD", color: "rose", minRating: 1700 }, // 13
  { nameKey: "Rank.fiveD", color: "rose", minRating: 1900 }, // 14
  { nameKey: "Rank.sixD", color: "purple", minRating: 2100 }, // 15
  { nameKey: "Rank.sevenD", color: "purple", minRating: 2300 }, // 16
  { nameKey: "Rank.eightD", color: "purple", minRating: 2500 }, // 17
];

type NextRankInfo = {
  index: number;
  name: string;
  color: string;
  ratingNeeded: number;
  winsNeeded: number;
};

export type RankInfo = {
  index: number;
  name: string;
  color: string;
  rating: number;
  percent: number;
  next: NextRankInfo | null;
};

// ハンデの種類（0: 互先, 1: 定先, 2〜25: 置石数, null: なし）
export type HandicapType = number | null;

type RowData = {
  rankKey: string;
  bot1: HandicapType;
  bot2: HandicapType;
  bot3: HandicapType;
};

// ID / 数値ベースでデータを定義（文字のハードコードなし）
export const HANDICAP_DATA: Record<BoardSize, RowData[]> = {
  5: [],
  9: [
    { rankKey: "tenK", bot1: 5, bot2: 5, bot3: 5 },
    { rankKey: "nineK", bot1: 4, bot2: 5, bot3: 5 },
    { rankKey: "eightK", bot1: 4, bot2: 4, bot3: 5 },
    { rankKey: "sevenK", bot1: 4, bot2: 4, bot3: 4 },
    { rankKey: "sixK", bot1: 3, bot2: 4, bot3: 4 },
    { rankKey: "fiveK", bot1: 3, bot2: 3, bot3: 4 },
    { rankKey: "fourK", bot1: 3, bot2: 3, bot3: 3 },
    { rankKey: "threeK", bot1: 2, bot2: 3, bot3: 3 },
    { rankKey: "twoK", bot1: 2, bot2: 2, bot3: 3 },
    { rankKey: "oneK", bot1: 2, bot2: 2, bot3: 2 },
    { rankKey: "oneD", bot1: 1, bot2: 2, bot3: 2 },
    { rankKey: "twoD", bot1: 1, bot2: 1, bot3: 2 },
    { rankKey: "threeD", bot1: 1, bot2: 1, bot3: 1 },
    { rankKey: "fourD", bot1: 0, bot2: 1, bot3: 1 },
    { rankKey: "fiveD", bot1: 0, bot2: 0, bot3: 1 },
    { rankKey: "sixD", bot1: 0, bot2: 0, bot3: 0 }, // bot1: 6D
    { rankKey: "sevenD", bot1: null, bot2: 0, bot3: 0 }, // bot2: 7D
    { rankKey: "eightD", bot1: null, bot2: null, bot3: 0 }, // bot3: 8D
  ],
  13: [
    { rankKey: "tenK", bot1: 9, bot2: 9, bot3: 9 },
    { rankKey: "nineK", bot1: 9, bot2: 9, bot3: 9 },
    { rankKey: "eightK", bot1: 8, bot2: 8, bot3: 8 },
    { rankKey: "sevenK", bot1: 8, bot2: 8, bot3: 8 },
    { rankKey: "sixK", bot1: 7, bot2: 7, bot3: 7 },
    { rankKey: "fiveK", bot1: 7, bot2: 7, bot3: 7 },
    { rankKey: "fourK", bot1: 6, bot2: 6, bot3: 6 },
    { rankKey: "threeK", bot1: 6, bot2: 6, bot3: 6 },
    { rankKey: "twoK", bot1: 5, bot2: 5, bot3: 5 },
    { rankKey: "oneK", bot1: 4, bot2: 5, bot3: 5 },
    { rankKey: "oneD", bot1: 3, bot2: 4, bot3: 4 },
    { rankKey: "twoD", bot1: 2, bot2: 4, bot3: 4 },
    { rankKey: "threeD", bot1: 1, bot2: 3, bot3: 3 },
    { rankKey: "fourD", bot1: 0, bot2: 2, bot3: 3 }, // bot1: 4D
    { rankKey: "fiveD", bot1: null, bot2: 1, bot3: 2 },
    { rankKey: "sixD", bot1: null, bot2: 0, bot3: 2 }, // bot2: 6D
    { rankKey: "sevenD", bot1: null, bot2: null, bot3: 1 },
    { rankKey: "eightD", bot1: null, bot2: null, bot3: 0 }, // bot3: 8D
  ],
  19: [
    { rankKey: "tenK", bot1: 25, bot2: 25, bot3: 25 },
    { rankKey: "nineK", bot1: 16, bot2: 25, bot3: 25 },
    { rankKey: "eightK", bot1: 9, bot2: 16, bot3: 16 },
    { rankKey: "sevenK", bot1: 8, bot2: 16, bot3: 16 },
    { rankKey: "sixK", bot1: 7, bot2: 9, bot3: 9 },
    { rankKey: "fiveK", bot1: 6, bot2: 9, bot3: 9 },
    { rankKey: "fourK", bot1: 5, bot2: 8, bot3: 8 },
    { rankKey: "threeK", bot1: 4, bot2: 7, bot3: 8 },
    { rankKey: "twoK", bot1: 3, bot2: 6, bot3: 7 },
    { rankKey: "oneK", bot1: 2, bot2: 5, bot3: 7 },
    { rankKey: "oneD", bot1: 1, bot2: 4, bot3: 6 },
    { rankKey: "twoD", bot1: 0, bot2: 3, bot3: 6 }, // bot1: 2D
    { rankKey: "threeD", bot1: null, bot2: 2, bot3: 5 },
    { rankKey: "fourD", bot1: null, bot2: 1, bot3: 4 },
    { rankKey: "fiveD", bot1: null, bot2: 0, bot3: 3 }, // bot2: 5D
    { rankKey: "sixD", bot1: null, bot2: null, bot3: 2 },
    { rankKey: "sevenD", bot1: null, bot2: null, bot3: 1 },
    { rankKey: "eightD", bot1: null, bot2: null, bot3: 0 }, // bot3: 8D
  ],
};
