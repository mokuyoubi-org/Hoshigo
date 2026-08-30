// constants/ranks.ts

import { TranslationKey } from "../language/lang";

export type Rank = {
  nameKey: TranslationKey;
  color: string;
  minPoints: number;
};

export const RANKS: Rank[] = [
  { nameKey: "Rank.tenK", color: "white", minPoints: 0 }, // 0
  { nameKey: "Rank.nineK", color: "white", minPoints: 20 }, // 1
  { nameKey: "Rank.eightK", color: "white", minPoints: 60 }, // 2
  { nameKey: "Rank.sevenK", color: "sky", minPoints: 120 }, // 3
  { nameKey: "Rank.sixK", color: "sky", minPoints: 200 }, // 4
  { nameKey: "Rank.fiveK", color: "sky", minPoints: 300 }, // 5
  { nameKey: "Rank.fourK", color: "green", minPoints: 420 }, // 6
  { nameKey: "Rank.threeK", color: "green", minPoints: 560 }, // 7
  { nameKey: "Rank.twoK", color: "green", minPoints: 720 }, // 8
  { nameKey: "Rank.oneK", color: "yellow", minPoints: 900 }, // 9
  { nameKey: "Rank.oneD", color: "yellow", minPoints: 1100 }, // 10
  { nameKey: "Rank.twoD", color: "yellow", minPoints: 1300 }, // 11
  { nameKey: "Rank.threeD", color: "coral", minPoints: 1500 }, // 12
  { nameKey: "Rank.fourD", color: "coral", minPoints: 1700 }, // 13
  { nameKey: "Rank.fiveD", color: "coral", minPoints: 1900 }, // 14
  { nameKey: "Rank.sixD", color: "purple", minPoints: 2100 }, // 15
  { nameKey: "Rank.sevenD", color: "purple", minPoints: 2300 }, // 16
  { nameKey: "Rank.eightD", color: "purple", minPoints: 2500 }, // 17
];

type NextRankInfo = {
  index: number;
  name: string;
  color: string;
  pointsNeeded: number;
  winsNeeded: number;
};

export type RankInfo = {
  index: number;
  name: string;
  color: string;
  points: number;
  percent: number;
  next: NextRankInfo | null;
};
