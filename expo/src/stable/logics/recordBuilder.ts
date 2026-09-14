// recordBuilder.ts

import { TFunction } from "@/src/active/i18n/types";
import { RecordType } from "@/src/active/types/record";
import { BLACK, BoardSize, Color, MatchType, RecordAnalysis } from "go-core";
import { getRankInfo } from "./rankLogics";

type BuildRecordArgs = {
  matchId: number;
  boardSize: BoardSize;
  matchType: MatchType;
  moves: number[];
  deadStones: number[];
  result: string | null;
  myColor: Color;
  myUid: string;
  myUsername: string;
  myIconIndex: number;
  myRating: number; // 更新後の値
  myRankIndexAfter: number;
  oppUid: string;
  oppUsername: string;
  oppIconIndex: number;
  oppRating: number; // 更新前の値。相手のレーティングの上がり下がりはどうでもいい
  t: TFunction;
  analysis: RecordAnalysis | null;
};

// 🐱 対局終了直後にGameScreen側が持っている材料一式から、
//    RecordType(recordsテーブル1行相当)を組み立てる純粋関数。
//    dependency directionルール: 引数は全部呼び出し側から渡してもらう、self-fetchはしない。
export function buildRecordFromMatch({
  matchId,
  boardSize,
  matchType,
  moves,
  deadStones,
  result,
  myColor,
  myUid,
  myUsername,
  myIconIndex,
  myRating,
  myRankIndexAfter,
  oppUid,
  oppUsername,
  oppIconIndex,
  oppRating,
  t,
  analysis,
}: BuildRecordArgs): RecordType {
  const isMeBlack = myColor === BLACK;
  const oppRankIndex = getRankInfo(oppRating, t).index;

  return {
    id: matchId,
    black_uid: isMeBlack ? myUid : oppUid,
    white_uid: isMeBlack ? oppUid : myUid,
    created_at: new Date().toISOString(),
    black_username: isMeBlack ? myUsername : oppUsername,
    white_username: isMeBlack ? oppUsername : myUsername,
    black_icon_index: isMeBlack ? myIconIndex : oppIconIndex,
    white_icon_index: isMeBlack ? oppIconIndex : myIconIndex,
    black_rank_index: isMeBlack ? myRankIndexAfter : oppRankIndex,
    white_rank_index: isMeBlack ? oppRankIndex : myRankIndexAfter,
    black_rating: isMeBlack ? myRating : oppRating,
    white_rating: isMeBlack ? oppRating : myRating,
    board_size: boardSize,
    result,
    moves,
    dead_stones: deadStones,
    match_type: matchType,
    analysis,
  };
}
