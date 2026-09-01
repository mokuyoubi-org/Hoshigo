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
  const { runAnalysis, engineReady } = useKataGoEngine();

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

  return { run, engineReady };
}
