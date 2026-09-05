import { RecordType } from "@/src/active/types/record";
import { TranslationKey } from "@/src/active/language/lang";
import { BLACK, BoardSize, Color, MatchType } from "expo-goband";
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
  myRatingBefore: number;
  myRankIndexAfter: number;
  oppUid: string;
  oppUsername: string;
  oppIconIndex: number;
  oppRatingBefore: number;
  oppRatingAfter: number;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
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
  myRatingBefore,
  myRankIndexAfter,
  oppUid,
  oppUsername,
  oppIconIndex,
  oppRatingBefore,
  oppRatingAfter,
  t,
}: BuildRecordArgs): RecordType {
  const isMeBlack = myColor === BLACK;
  const oppRankIndexAfter = getRankInfo(oppRatingAfter, t).index;

  return {
    id: matchId,
    black_uid: isMeBlack ? myUid : oppUid,
    white_uid: isMeBlack ? oppUid : myUid,
    created_at: new Date().toISOString(),
    black_username: isMeBlack ? myUsername : oppUsername,
    white_username: isMeBlack ? oppUsername : myUsername,
    black_icon_index: isMeBlack ? myIconIndex : oppIconIndex,
    white_icon_index: isMeBlack ? oppIconIndex : myIconIndex,
    black_rank_index: isMeBlack ? myRankIndexAfter : oppRankIndexAfter,
    white_rank_index: isMeBlack ? oppRankIndexAfter : myRankIndexAfter,
    black_rating: isMeBlack ? myRatingBefore : oppRatingBefore,
    white_rating: isMeBlack ? oppRatingBefore : myRatingBefore,
    board_size: boardSize,
    result,
    moves,
    dead_stones: deadStones,
    match_type: matchType,
    analysis: null,
  };
}