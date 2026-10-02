// resultLogics.ts

import { TFunction } from "@/src/active/i18n/types";
import { BoardSize } from "go-core";
import { getRankInfo } from "./rankLogics";

// UserPointResultの定義もこちらに引っ越し(stableがactiveの型に依存しないように)
export type MyData = {
  old_rating: number;
  new_rating: number;
  wins: number;
  giant_killing_streak?: number;
  giant_killing_bonus?: boolean;
};

export type MatchResultUpdate = {
  ratingBefore: number;
  rankIndexBefore: number;
  ratingAfter: number;
  rankIndexAfter: number;
  giantKillingBonus: boolean;

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
  myData: MyData, // supabaseから届いた
  t: TFunction,
): MatchResultUpdate | null {
  const maybeRating = myData.new_rating;
  console.log("maybeRating: ", maybeRating);
  if (isNaN(maybeRating)) return null;

  // 🥶 beforeは「まだupdateProfileを呼ぶ前」の値を、この時点で確定させる
  const oldRating = myData.old_rating;
  const oldRankIndex = getRankInfo(oldRating, t).index;

  return {
    ratingBefore: oldRating,
    rankIndexBefore: oldRankIndex,
    ratingAfter: maybeRating,
    rankIndexAfter: getRankInfo(maybeRating, t).index,
    giantKillingBonus: myData.giant_killing_bonus ?? false,
    profilePatch: {
      ...(boardSize === 9
        ? {
            rating9: maybeRating,
            giantKillingStreak9: myData.giant_killing_streak,
            wins9: myData.wins,
          }
        : boardSize === 13
          ? {
              rating13: maybeRating,
              giantKillingStreak13: myData.giant_killing_streak,
              wins13: myData.wins,
            }
          : {
              rating19: maybeRating,
              giantKillingStreak19: myData.giant_killing_streak,
              wins19: myData.wins,
            }),
    },
  };
}
