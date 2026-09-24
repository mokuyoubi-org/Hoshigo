// rankThreshold.ts (新規、または useMatchingProvider.ts の先頭に直接置いてもOK)
import { RANKS } from "@/src/active/constants/ranks";
import { BoardSize } from "go-core";

// "9級" のminRatingを名前から動的に引く。RANKSの並びが変わっても
// 追従できるように、インデックスを決め打ちしない。
const NINE_K_MIN_RATING =
  RANKS.find((rank) => rank.nameKey === "Rank.nineK")?.minRating ?? 0;

export function isNineKOrStronger(rating: number | null): boolean {
  return (rating ?? 0) >= NINE_K_MIN_RATING;
}

// 盤サイズに対応するレートを取り出す。5路盤はランク制度の対象外という
// 想定でnullを返す(＝b18必須チェックの対象外)。ここ、認識違ったら教えてください。
export function getRatingForBoardSize(
  boardSize: BoardSize,
  ratings: {
    rating9: number | null;
    rating13: number | null;
    rating19: number | null;
  },
): number | null {
  switch (boardSize) {
    case 9:
      return ratings.rating9;
    case 13:
      return ratings.rating13;
    case 19:
      return ratings.rating19;
    default:
      return null;
  }
}