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

// 手(moves)の中身の注文。x, y は「その手の住所」なので常に付く。
export type MoveFields = {
  winRate?: boolean;
  winRateLost?: boolean;
  scoreLead?: boolean;
  scoreSelfplay?: boolean;
  scoreStdev?: boolean;
  visits?: boolean;
  pointsLost?: boolean;
  relativePointsLost?: boolean;
  order?: boolean;
  prior?: boolean;
  pv?: boolean;
};

// 出力フィールドの注文書。頼んだものだけ返ってくる。何も頼まなければ空っぽ。
export type AnalyzeResultFields = {
  winRate?: boolean;
  scoreLead?: boolean;
  scoreSelfplay?: boolean;
  scoreStdev?: boolean;
  visits?: boolean;
  ownership?: boolean;
  ownershipStdev?: boolean;
  policy?: boolean;
  moves?: MoveFields;
};

// 1手ぶんの型。x, y は必ずあり、あとは頼んだものだけ。
export type MoveInfoFor<M extends MoveFields> = {
  x: number;
  y: number;
} & (M extends { winRate: true } ? { winRate: number } : unknown) &
  (M extends { winRateLost: true } ? { winRateLost: number } : unknown) &
  (M extends { scoreLead: true } ? { scoreLead: number } : unknown) &
  (M extends { scoreSelfplay: true } ? { scoreSelfplay: number } : unknown) &
  (M extends { scoreStdev: true } ? { scoreStdev: number } : unknown) &
  (M extends { visits: true } ? { visits: number } : unknown) &
  (M extends { pointsLost: true } ? { pointsLost: number } : unknown) &
  (M extends { relativePointsLost: true }
    ? { relativePointsLost: number }
    : unknown) &
  (M extends { order: true } ? { order: number } : unknown) &
  (M extends { prior: true } ? { prior: number } : unknown) &
  (M extends { pv: true } ? { pv: string[] } : unknown);

// 解析結果の型。注文書 F に書いたものだけ、型の上でも確実に入っている。
export type AnalyzeResultFor<F extends AnalyzeResultFields> = (F extends {
  winRate: true;
}
  ? { winRate: number }
  : unknown) &
  (F extends { scoreLead: true } ? { scoreLead: number } : unknown) &
  (F extends { scoreSelfplay: true } ? { scoreSelfplay: number } : unknown) &
  (F extends { scoreStdev: true } ? { scoreStdev: number } : unknown) &
  (F extends { visits: true } ? { visits: number } : unknown) &
  (F extends { ownership: true }
    ? { ownership: number[] | FloatArray }
    : unknown) &
  (F extends { ownershipStdev: true }
    ? { ownershipStdev: number[] | FloatArray }
    : unknown) &
  (F extends { policy: true } ? { policy: number[] | FloatArray } : unknown) &
  (F extends { moves: infer M extends MoveFields }
    ? { moves: MoveInfoFor<M>[] }
    : unknown);

export type AnalyzeBoardArgs = {
  currentPlayer: Color;
  board: Board2D;
  moves: MoveObject[];
  boardSize: BoardSize;
  komi: number;
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

// DLとウォームアップ、両方まとめた「読み込み全体の今の状態」
export type ModelLoadStage =
  | { phase: "downloading"; loaded: number; total: number }
  | { phase: "warming_up"; step: number; totalSteps: number };

export type LoadProgressState = {
  stage: ModelLoadStage;
} | null;

export type KataGoEngineRef = {
  analyzeBoard: <const F extends AnalyzeResultFields>(
    args: AnalyzeBoardArgs & { fields: F },
  ) => Promise<AnalyzeResultFor<F> | null>;
  // ⚠️ 戻り値のPromiseは信用できない(ref越しの呼び出しは、実処理の完了を
  // 待たずに解決してしまう)。「本当に終わったか」は onModelReady、
  // 「失敗したか」は onModelError のコールバックでのみ判定すること。
  warmupModel: () => Promise<void>;
};

export type ModelDownloadProgress = {
  loaded: number;
  total: number; // content-lengthが取れない場合は0
};
