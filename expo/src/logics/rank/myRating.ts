// src/logics/rank/myRating.ts
//
// 盤サイズごとの「自分のレート」を返す。
// 5路盤はレートを持たない(練習でだけ遊べる盤)ので、いつも0を返す。

import { BoardSize } from "go-core";

type MyRatings = {
  rating9: number | null;
  rating13: number | null;
  rating19: number | null;
};

export const getMyRating = (
  ratings: MyRatings,
  boardSize: BoardSize,
): number => {
  switch (boardSize) {
    case 5:
      return 0;
    case 9:
      return ratings.rating9 ?? 0;
    case 13:
      return ratings.rating13 ?? 0;
    case 19:
      return ratings.rating19 ?? 0;
  }
};