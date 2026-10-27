// resultLogics.ts

import type { BoardStats } from "@/src/contexts/ProfileContexts";
import { TFunction } from "@/src/i18n/types";
import { getRankInfo } from "@/src/logics/rank/rankLogics";

// UserPointResultの定義もこちらに引っ越し(stableがactiveの型に依存しないように)
type MyData = {
  old_rating: number;
  new_rating: number;
  wins: number;
};

export type MatchResultUpdate = {
  ratingBefore: number;
  rankIndexBefore: number;
  ratingAfter: number;
  rankIndexAfter: number;

  // この盤面の成績に反映する分(updateStats に渡す)
  statsPatch: Partial<BoardStats>;
};

// オンライン対局の盤面サイズは 9 / 13 / 19 だけ
export const computeMatchResultUpdate = (
  myData: MyData, // サーバから届いた
  t: TFunction,
): MatchResultUpdate | null => {
  const maybeRating = myData.new_rating;
  console.log("maybeRating: ", maybeRating);
  if (isNaN(maybeRating)) return null;

  // 🥶 beforeは「まだupdateStatsを呼ぶ前」の値を、この時点で確定させる
  const oldRating = myData.old_rating;
  const oldRankIndex = getRankInfo(oldRating, t).index;

  return {
    ratingBefore: oldRating,
    rankIndexBefore: oldRankIndex,
    ratingAfter: maybeRating,
    rankIndexAfter: getRankInfo(maybeRating, t).index,
    statsPatch: {
      rating: maybeRating,
      wins: myData.wins,
    },
  };
};
