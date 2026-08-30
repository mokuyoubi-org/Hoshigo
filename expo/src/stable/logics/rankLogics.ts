import { TranslationKey } from "@/src/active/language/lang";
import { RankInfo, RANKS } from "../../active/constants/ranks";

const DEFAULT_POINTS_PER_WIN = 10;

const pointsToRankIndex = (points: number): number => {
  const safePoints = Math.max(0, points);
  const rankIndex = RANKS.findLastIndex((rank) => rank.minPoints <= safePoints);
  return rankIndex !== -1 ? rankIndex : 0;
};

const pointsNeededToWinsNeeded = (
  points: number,
  pointsPerWin: number = DEFAULT_POINTS_PER_WIN,
): number => {
  if (points <= 0 || pointsPerWin <= 0) return 0;
  return Math.ceil(points / pointsPerWin);
};

export function getRankInfo(
  points: number | null,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): RankInfo {
  const safePoints = Math.max(0, points ?? 0);
  const rankIndex = pointsToRankIndex(safePoints);
  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];

  if (nextRank) {
    const currentMin = rank.minPoints;
    const nextMin = nextRank.minPoints;
    const totalRange = nextMin - currentMin;
    const currentProgress = safePoints - currentMin;
    const percent = Math.min(
      100,
      Math.floor((currentProgress / totalRange) * 100),
    );
    const pointsNeeded = Math.max(0, nextMin - safePoints);
    const winsNeeded = pointsNeededToWinsNeeded(
      pointsNeeded,
      DEFAULT_POINTS_PER_WIN,
    );

    return {
      index: rankIndex,
      name: t(rank.nameKey),
      color: rank.color,
      points: safePoints,
      percent,
      next: {
        index: rankIndex + 1,
        name: t(nextRank.nameKey),
        color: nextRank.color,
        pointsNeeded,
        winsNeeded,
      },
    };
  }

  return {
    index: rankIndex,
    name: t(rank.nameKey),
    color: rank.color,
    points: safePoints,
    percent: 100,
    next: null,
  };
}
