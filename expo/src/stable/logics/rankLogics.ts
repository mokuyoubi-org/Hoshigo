import { TranslationKey } from "@/src/active/language/lang";
import { RankInfo, RANKS } from "../../active/constants/ranks";

const RATING_PER_WIN = 10;

const ratingToRankIndex = (rating: number): number => {
  const safeRating = Math.max(0, rating);
  const rankIndex = RANKS.findLastIndex((rank) => rank.minRating <= safeRating);
  return rankIndex !== -1 ? rankIndex : 0;
};

const ratingNeededToWinsNeeded = (
  rating: number,
  ratingPerWin: number = RATING_PER_WIN,
): number => {
  if (rating <= 0 || ratingPerWin <= 0) return 0;
  return Math.ceil(rating / ratingPerWin);
};

export function getRankInfo(
  rating: number | null,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): RankInfo {
  const safeRating = Math.max(0, rating ?? 0);
  const rankIndex = ratingToRankIndex(safeRating);
  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];

  if (nextRank) {
    const currentMin = rank.minRating;
    const nextMin = nextRank.minRating;
    const totalRange = nextMin - currentMin;
    const currentProgress = safeRating - currentMin;
    const percent = Math.min(
      100,
      Math.floor((currentProgress / totalRange) * 100),
    );
    const ratingNeeded = Math.max(0, nextMin - safeRating);
    const winsNeeded = ratingNeededToWinsNeeded(
      ratingNeeded,
      RATING_PER_WIN,
    );

    return {
      index: rankIndex,
      name: t(rank.nameKey),
      color: rank.color,
      rating: safeRating,
      percent,
      next: {
        index: rankIndex + 1,
        name: t(nextRank.nameKey),
        color: nextRank.color,
        ratingNeeded,
        winsNeeded,
      },
    };
  }

  return {
    index: rankIndex,
    name: t(rank.nameKey),
    color: rank.color,
    rating: safeRating,
    percent: 100,
    next: null,
  };
}
