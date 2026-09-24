// resultLogics.ts

import { TFunction } from "@/src/active/i18n/types";
import { BoardSize } from "go-core";
import { getRankInfo } from "./rankLogics";

// UserPointResultの定義もこちらに引っ越し(stableがactiveの型に依存しないように)
export type UserPointResult = {
  new_rating: number;
  giant_killing_streak?: number;
  giant_killing_streak_bonus_applied?: boolean;
};

export type MatchResultUpdate = {
  ratingBefore: number;
  rankIndexBefore: number;
  ratingAfter: number;
  rankIndexAfter: number;
  giantKillingStreakBonusApplied: boolean;

  profilePatch: {
    rating9?: number;
    rating13?: number;
    rating19?: number;
    giantKillingStreak9?: number;
    giantKillingStreak13?: number;
    giantKillingStreak19?: number;
  };
};

export function computeMatchResultUpdate(
  boardSize: BoardSize,
  pointResult: UserPointResult, // supabaseから届いた、
  currentRating9: number,
  currentRating13: number,
  currentRating19: number,
  t: TFunction,
): MatchResultUpdate | null {
  const maybeRating = pointResult.new_rating;
  console.log("maybeRating: ", maybeRating);
  if (isNaN(maybeRating)) return null;

  // 🥶 beforeは「まだupdateProfileを呼ぶ前」の値を、この時点で確定させる
  const oldRating =
    boardSize === 9
      ? currentRating9
      : boardSize === 13
        ? currentRating13
        : currentRating19;
  const oldRankIndex = getRankInfo(oldRating, t).index;

  return {
    ratingBefore: oldRating,
    rankIndexBefore: oldRankIndex,
    ratingAfter: maybeRating,
    rankIndexAfter: getRankInfo(maybeRating, t).index,
    giantKillingStreakBonusApplied:
      pointResult.giant_killing_streak_bonus_applied ?? false,
    profilePatch: {
      ...(boardSize === 9
        ? {
            rating9: maybeRating,
            giantKillingStreak9: pointResult.giant_killing_streak,
          }
        : boardSize === 13
          ? {
              rating13: maybeRating,
              giantKillingStreak13: pointResult.giant_killing_streak,
            }
          : {
              rating19: maybeRating,
              giantKillingStreak19: pointResult.giant_killing_streak,
            }),
    },
  };
}
