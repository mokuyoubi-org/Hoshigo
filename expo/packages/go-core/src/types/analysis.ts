// types/analysis.ts
// ====================================================================================
// 【ファイル全体の責務】
// 手ごとのKataGo解析結果をDBに保存するための型定義。
// ====================================================================================

type CandidateMove = {
  x: number;
  y: number;
  winRate: number; // 0-100の整数、黒視点
};

export type MoveAnalysisEntry = {
  winRate: number; // 0-100の整数、黒視点
  scoreLead: number; // 黒視点、小数点2桁（+なら黒有利）
  ownership: number[]; // boardSize*boardSize、小数点2桁、行優先（y*boardSize+x）
  candidates: CandidateMove[]; // 上位10手
  // analysis.tsのbuildMoveAnalysisEntry関数内でトリミングしている
};

export type RecordAnalysis = {
  perMove: (MoveAnalysisEntry | null)[]; // 長さ = record.moves.length
};