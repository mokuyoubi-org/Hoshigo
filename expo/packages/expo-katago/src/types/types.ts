// packages/expo-katago/src/types/types.ts

import { Board2D, Color, MoveObject } from "go-core";
import {
  BoardSize,
  FloatArray,
  GameRules,
  RegionOfInterest,
} from "../web-katrain/src/types";

// ================================================================
// 型定義
// ================================================================

// 出力フィールドの取捨選択。省略時(undefined)は元のweb-katrainと同じフル出力。
// このアプリでは useKataGo.ts 側で明示的に false を渡して絞っている。
export type AnalyzeResultFields = {
  scoreSelfplay?: boolean;
  scoreStdev?: boolean;
  visits?: boolean;
  ownershipStdev?: boolean;
  policy?: boolean;
  moveDetails?: boolean; // falseなら moves は {x, y, winRate, scoreLead} のみになる
};

export type AnalyzeBoardArgs = {
  currentPlayer: Color;
  board: Board2D;
  moves: MoveObject[];
  boardSize: BoardSize;
  komi?: number;
  rules?: GameRules;
  visits?: number;
  maxTimeMs?: number;
  topK?: number;
  pvLen?: number;
  wideRootNoise?: number;
  nnRandomize?: boolean;
  regionOfInterest?: RegionOfInterest | null;
  fields?: AnalyzeResultFields;
};

export type AnalyzeResult = {
  winRate: number; // 🌟
  scoreLead: number; // 🌟
  scoreSelfplay?: number;
  scoreStdev?: number;
  visits?: number;
  ownership: number[] | FloatArray; // 🌟
  ownershipStdev?: number[] | FloatArray;
  policy?: number[] | FloatArray;
  moves: MoveInfo[]; // 🌟
};

export type MoveInfo = {
  x: number; // 🌟
  y: number; // 🌟
  winRate: number; // 🌟
  winRateLost?: number;
  scoreLead: number; // 🌟
  scoreSelfplay?: number;
  scoreStdev?: number;
  visits?: number;
  pointsLost?: number;
  relativePointsLost?: number;
  order?: number;
  prior?: number;
  pv?: string[];
};

// DLとウォームアップ、両方まとめた「読み込み全体の今の状態」
export type ModelLoadStage =
  | { phase: "downloading"; loaded: number; total: number }
  | { phase: "warming_up"; step: number; totalSteps: number };

export type LoadProgressState = {
  stage: ModelLoadStage;
} | null;

export type KataGoEngineRef = {
  analyzeBoard: (args: AnalyzeBoardArgs) => Promise<AnalyzeResult | null>;
  // ⚠️ 戻り値のPromiseは信用できない(ref越しの呼び出しは、実処理の完了を
  // 待たずに解決してしまう)。「本当に終わったか」は onModelReady、
  // 「失敗したか」は onModelError のコールバックでのみ判定すること。
  warmupModel: () => Promise<void>;
};

export type ModelDownloadProgress = {
  loaded: number;
  total: number; // content-lengthが取れない場合は0
};