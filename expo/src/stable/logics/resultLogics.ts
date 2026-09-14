// resultLogics.ts

import { TFunction } from "@/src/active/i18n/types";
import { BoardSize } from "go-core";
import { getRankInfo } from "./rankLogics";

// UserPointResultの定義もこちらに引っ越し(stableがactiveの型に依存しないように)
export type UserPointResult = {
  new_rating: number;
};

export type MatchResultUpdate = {
  ratingBefore: number;
  rankIndexBefore: number;
  ratingAfter: number;
  rankIndexAfter: number;

  profilePatch: {
    rating9?: number;
    rating13?: number;
  };
};

export function computeMatchResultUpdate(
  boardSize: BoardSize,
  pointResult: UserPointResult, // supabaseから届いた、
  currentRating9: number,
  currentRating13: number,
  t: TFunction,
): MatchResultUpdate | null {
  const maybeRating = pointResult.new_rating;
  console.log("maybeRating: ", maybeRating)
  if (isNaN(maybeRating)) return null;

  // 🥶 beforeは「まだupdateProfileを呼ぶ前」の値を、この時点で確定させる
  const oldRating = boardSize === 9 ? currentRating9 : currentRating13;
  const oldRankIndex = getRankInfo(oldRating, t).index;

  return {
    ratingBefore: oldRating,
    rankIndexBefore: oldRankIndex,
    ratingAfter: maybeRating,
    rankIndexAfter: getRankInfo(maybeRating, t).index,
    profilePatch: {
      ...(boardSize === 9
        ? { rating9: maybeRating }
        : { rating13: maybeRating }),
    },
  };
}
