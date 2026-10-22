// types/analysis.ts
// 【ファイル全体の責務】
// 手ごとのKataGo解析結果をDBに保存するための型定義。

import { Grid } from "./go";

// B . Wのいずれかからなるstring
export type Ownership = string;

export type MoveAnalysisEntry = {
  winRate: number; // 0-100の整数、黒視点
  // 黒視点、小数点2桁（+なら黒有利）。
  // 確定した局面(連続パスで終わり、終局とも判定された)だけ、goscorerの数字で上書き済み。
  scoreLead: number;
  // boardSize*boardSize、小数点2桁、行優先（y*boardSize+x）、黒=+1 / 白="W"。
  // 確定した局面だけ、goscorerの結果(1 / 0 / -1のみ)で上書き済み。
  // どちらの場合も同じ読み方でよい(ownershipToTerritoryBoardなどにそのまま渡せる)。
  ownership: Ownership;
  candidates: Grid[]; // 上位10手
};

export type RecordAnalysis = {
  // 長さ = record.moves.length + 1。
  // pos[i]は「i手打った後の局面」の分析で、最後の要素は最終局面。
  pos: (MoveAnalysisEntry | null)[];
};
