// recordCardLogics.ts

import { Skeleton, SkeletonOr } from "@/src/types/record";

export const makeSkeletonCard = (fetchCount: number): Skeleton[] =>
  Array.from({ length: fetchCount }, (_, i) => ({
    id: -1 - i,
    isSkeleton: true,
  }));

export const isSkeletonCard = <T extends { id: number | string }>(
  r: SkeletonOr<T>,
): r is Skeleton => "isSkeleton" in r;
