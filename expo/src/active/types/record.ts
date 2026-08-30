// ✅active
// types/record.ts
import { MatchType } from "expo-goband";

export type RecordType = {
  id: number;
  black_uid: string;
  white_uid: string;
  created_at: string;
  black_username: string;
  white_username: string;
  black_icon_index: number;
  white_icon_index: number;
  black_rank_index: number;
  white_rank_index: number;
  result: string | null;
  moves: number[];
  dead_stones: number[];
  match_type: MatchType;
};

export type RecordOrSkeleton = SkeletonOr<RecordType>;

export type Skeleton = { id: number; isSkeleton: true };
export type SkeletonOr<T extends { id: number | string }> = T | Skeleton;
