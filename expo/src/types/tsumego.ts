// Hoshigo
// expo/src/types/tsumego.ts
// 詰碁の型。サーバーの get_tsumego_batch が返す形と同じ。

import { BoardSize, Grid } from "go-core";

// 正解・不正解の「木」の1つ分。
// move = ユーザー(または相手)の手。result があれば、そこで解き終わり(correct)か不正解(wrong)。
// 反撃の手順は children に続く。木にない手は「その他の不正解」として扱う。
export type TsumegoNode = {
  move: Grid;
  result?: "correct" | "wrong";
  comment?: string;
  children?: TsumegoNode[];
};

export type TsumegoType = {
  id: string;
  board_size: BoardSize;
  black_stones: Grid[]; // 最初から盤にある、黒石の位置
  white_stones: Grid[]; // 最初から盤にある、白石の位置
  to_play: "black" | "white"; // どちらの番から始まるか
  tree: TsumegoNode[]; // 最初の局面の、手の候補の並び
  rating: number;
  like_count: number;
  solved_count: number;
  liked: boolean; // この人が、いいね済みかどうか
};

// 結果を送るときの種類
export type TsumegoResult = "solved" | "failed" | "skipped";