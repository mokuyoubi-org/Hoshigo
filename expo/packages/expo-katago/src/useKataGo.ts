// useKataGo.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 「Board / Grid[]（アプリで普段使っている形）を渡すと、KataGoの解析結果
// (AnalyzeResult)が返ってくる」という、盤面フォーマットの変換に徹した
// 薄い層。結果から何を取り出すか(最善手だけ？死に石だけ？)は、
// 用途ごとの専用hook(useBotMove, useEndgameAnalysis)の仕事にする。
//
// WebViewとの通信・多重呼び出しの直列化はKataGoEngineContextのrunAnalysisが
// 一手に引き受けている。
//
// getBestAvailableModel は「本当は使いたいモデル」の優先順位リストを渡すと、
// その中で今すぐ遅延なく使えるモデルIDを返す。例えばb18を使いたいが
// まだウォームアップ中なら、自動的にb10やb6にフォールバックできる。
//
// 置き場所: src/active/hooks/useKataGo.ts
// ──────────────────────────────────────────────────

import { useKataGoEngine } from "./KataGoEngineContext";

import { Board, BoardSize, Color, Grid, MatchType } from "./types";
import { boardToBoard2D, movesToMoveObjects } from "./utils";
import { AnalyzeResult } from "./web-katrain/analyzeBoard";
import { ModelId } from "./web-katrain/modelManager";

export type KataGoParams = {
  board: Board;
  movesSoFar: Grid[];
  currentPlayer: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  modelId: ModelId;
};

export function useKataGo() {
  const { runAnalysis, engineReady, readyModelIds } = useKataGoEngine();

  const run = async ({
    board,
    movesSoFar,
    currentPlayer,
    boardSize,
    matchType,
    modelId,
  }: KataGoParams): Promise<AnalyzeResult | null> => {
    return runAnalysis({
      board: boardToBoard2D(board, boardSize),
      moves: movesToMoveObjects(movesSoFar, boardSize, matchType),
      currentPlayer,
      modelId,
      boardSize,
    });
  };

  // 優先順位リスト(例: ["b18","b10","b6"])のうち、今すぐ使えるものを返す。
  // 何も見つからない場合はリストの最後(=通常は最軽量、常に準備済みのはず)を返す。
  const getBestAvailableModel = (preferenceOrder: ModelId[]): ModelId => {
    for (const id of preferenceOrder) {
      if (readyModelIds.has(id)) return id;
    }
    return preferenceOrder[preferenceOrder.length - 1];
  };

  return { run, engineReady, getBestAvailableModel };
}