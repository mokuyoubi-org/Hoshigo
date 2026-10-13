// recordBuilder.ts

import { RecordType } from "@/src/types/record";
import { BoardSize, MatchType, RecordAnalysis } from "go-core";

type BuildRecordArgs = {
  matchId: string;
  boardSize: BoardSize;
  matchType: MatchType;
  moves: number[];
  result: string | null;
  blackUid: string;
  blackUsername: string;
  blackIconIndex: number;
  blackRankIndex: number;
  blackRating: number;
  whiteUid: string;
  whiteUsername: string;
  whiteIconIndex: number;
  whiteRankIndex: number;
  whiteRating: number;
  analysis: RecordAnalysis | null;
};

export const buildRecordFromMatch = ({
  matchId,
  boardSize,
  matchType,
  moves,
  result,
  blackUid,
  blackUsername,
  blackIconIndex,
  blackRankIndex,
  blackRating,
  whiteUid,
  whiteUsername,
  whiteIconIndex,
  whiteRating,
  whiteRankIndex,
  analysis,
}: BuildRecordArgs): RecordType => ({
    id: matchId,
    black_uid: blackUid,
    white_uid: whiteUid,
    created_at: new Date().toISOString(),
    black_username: blackUsername,
    white_username: whiteUsername,
    black_icon_index: blackIconIndex,
    white_icon_index: whiteIconIndex,
    black_rank_index: blackRankIndex,
    white_rank_index: whiteRankIndex,
    black_rating: blackRating,
    white_rating: whiteRating,
    board_size: boardSize,
    result,
    moves,
    match_type: matchType,
    analysis,
  });
