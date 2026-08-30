// resultLogics.ts

import { BoardSize } from "expo-goband";
import { TranslationKey } from "@/src/active/language/lang";
import { getRankInfo } from "./rankLogics";

// UserPointResultの定義もこちらに引っ越し(stableがactiveの型に依存しないように)
export type UserPointResult = {
  delta: number;
  new_points: number;
  acquired_icons: number[];
};

export type MatchResultUpdate = {
  pointsBefore: number;
  rankIndexBefore: number;
  pointsAfter: number;
  rankIndexAfter: number;
  newlyAcquiredIcons: number[];
  profilePatch: {
    points9?: number;
    points13?: number;
    acquiredIcons: number[];
  };
};

export function computeMatchResultUpdate(
  boardSize: BoardSize,
  pointResult: UserPointResult, // supabaseから届いた、
  currentPoints9: number,
  currentPoints13: number,
  currentAcquiredIcons: number[],
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): MatchResultUpdate | null {
  const maybePoints = Number(pointResult.new_points);
  if (isNaN(maybePoints)) return null;

  // 🥶 beforeは「まだupdateProfileを呼ぶ前」の値を、この時点で確定させる
  const oldPoints = boardSize === 9 ? currentPoints9 : currentPoints13;
  const oldRankIndex = getRankInfo(oldPoints, t).index;

  const newlyAcquired = Array.isArray(pointResult.acquired_icons)
    ? pointResult.acquired_icons
    : [];
  const mergedIcons = Array.from(new Set([...currentAcquiredIcons, ...newlyAcquired]));

  return {
    pointsBefore: oldPoints,
    rankIndexBefore: oldRankIndex,
    pointsAfter: maybePoints,
    rankIndexAfter: getRankInfo(maybePoints, t).index,
    newlyAcquiredIcons: newlyAcquired,
    profilePatch: {
      ...(boardSize === 9 ? { points9: maybePoints } : { points13: maybePoints }),
      acquiredIcons: mergedIcons,
    },
  };
}