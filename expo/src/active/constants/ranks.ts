// constants/ranks.ts

import { TranslationKey } from "../language/lang";

export type Rank = {
  nameKey: TranslationKey;
  color: string;
  minRating: number;
};

export const RANKS: Rank[] = [
  { nameKey: "Rank.tenK", color: "white", minRating: 0 }, // 0
  { nameKey: "Rank.nineK", color: "white", minRating: 20 }, // 1
  { nameKey: "Rank.eightK", color: "white", minRating: 60 }, // 2
  { nameKey: "Rank.sevenK", color: "sky", minRating: 120 }, // 3
  { nameKey: "Rank.sixK", color: "sky", minRating: 200 }, // 4
  { nameKey: "Rank.fiveK", color: "sky", minRating: 300 }, // 5
  { nameKey: "Rank.fourK", color: "green", minRating: 420 }, // 6
  { nameKey: "Rank.threeK", color: "green", minRating: 560 }, // 7
  { nameKey: "Rank.twoK", color: "green", minRating: 720 }, // 8
  { nameKey: "Rank.oneK", color: "yellow", minRating: 900 }, // 9
  { nameKey: "Rank.oneD", color: "yellow", minRating: 1100 }, // 10
  { nameKey: "Rank.twoD", color: "yellow", minRating: 1300 }, // 11
  { nameKey: "Rank.threeD", color: "coral", minRating: 1500 }, // 12
  { nameKey: "Rank.fourD", color: "coral", minRating: 1700 }, // 13
  { nameKey: "Rank.fiveD", color: "coral", minRating: 1900 }, // 14
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
