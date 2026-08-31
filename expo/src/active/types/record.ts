import { BoardSize, MatchType } from "expo-goband";
import { RecordAnalysis } from "./analysis";

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
  black_points: number;
  white_points: number;
  board_size: BoardSize;
  result: string | null;
  moves: number[];
  dead_stones: number[];
  match_type: MatchType;
  analysis: RecordAnalysis | null; // 🆕追加
};

export type RecordOrSkeleton = SkeletonOr<RecordType>;

export type Skeleton = { id: number; isSkeleton: true };
export type SkeletonOr<T extends { id: number | string }> = T | Skeleton;