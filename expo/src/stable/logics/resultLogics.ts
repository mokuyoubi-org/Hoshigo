// resultLogics.ts

import { TranslationKey } from "@/src/active/language/lang";
import { BoardSize } from "expo-goband";
import { getRankInfo } from "./rankLogics";

// UserPointResultの定義もこちらに引っ越し(stableがactiveの型に依存しないように)
export type UserPointResult = {
  delta: number;
  new_rating: number;
  acquired_icons: number[];
};

export type MatchResultUpdate = {
  ratingBefore: number;
  rankIndexBefore: number;
  ratingAfter: number;
  rankIndexAfter: number;
  newlyAcquiredIcons: number[];
  profilePatch: {
    rating9?: number;
    rating13?: number;
    acquiredIcons: number[];
  };
};

export function computeMatchResultUpdate(
  boardSize: BoardSize,
  pointResult: UserPointResult, // supabaseから届いた、
  currentRating9: number,
  currentRating13: number,
  currentAcquiredIcons: number[],
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): MatchResultUpdate | null {
  const maybeRating = Number(pointResult.new_rating);
  if (isNaN(maybeRating)) return null;

  // 🥶 beforeは「まだupdateProfileを呼ぶ前」の値を、この時点で確定させる
  const oldRating = boardSize === 9 ? currentRating9 : currentRating13;
  const oldRankIndex = getRankInfo(oldRating, t).index;

  const newlyAcquired = Array.isArray(pointResult.acquired_icons)
    ? pointResult.acquired_icons
    : [];
  const mergedIcons = Array.from(
    new Set([...currentAcquiredIcons, ...newlyAcquired]),
  );

  return {
    ratingBefore: oldRating,
    rankIndexBefore: oldRankIndex,
    ratingAfter: maybeRating,
    rankIndexAfter: getRankInfo(maybeRating, t).index,
    newlyAcquiredIcons: newlyAcquired,
    profilePatch: {
      ...(boardSize === 9
        ? { rating9: maybeRating }
        : { rating13: maybeRating }),
      acquiredIcons: mergedIcons,
    },
  };
}
