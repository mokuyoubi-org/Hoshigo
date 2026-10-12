// packages/expo-katago/src/hooks/useKataGo.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 「Board / Grid[]（アプリで普段使っている形）を渡すと、KataGoの解析結果
// (AnalyzeResult)が返ってくる」という、盤面フォーマットの変換に徹した
// 薄い層。
//
// WebViewとの通信・多重呼び出しの直列化はKataGoEngineContextのrunAnalysisが
// 一手に引き受けている。requestIdを渡すとcancelQueuedAnalysisで後から
// (まだキューに積まれてるだけの間だけ)取り消せる。
//
// ──────────────────────────────────────────────────

import { useKataGoEngine } from "../components/KataGoEngineContext";

import {
  Board,
  BoardSize,
  boardToBoard2D,
  Color,
  Grid,
  KOMI,
  MatchType,
  movesToMoveObjects,
} from "go-core";
import { AnalyzeResult, AnalyzeResultFields } from "../types/types";

type KataGoParams = {
  board: Board;
  movesSoFar: Grid[];
  currentPlayer: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  fields?: AnalyzeResultFields;
};

export const useKataGo = () => {
  const { runAnalysis, engineReady, cancelQueuedAnalysis } = useKataGoEngine();

  const run = async (
    {
      board,
      movesSoFar,
      currentPlayer,
      boardSize,
      matchType,
      fields,
    }: KataGoParams,
    requestId?: string,
  ): Promise<AnalyzeResult | null> => {
    return runAnalysis(
      {
        board: boardToBoard2D(board, boardSize),
        moves: movesToMoveObjects(movesSoFar, boardSize, matchType),
        currentPlayer,
        boardSize,
        fields,
        komi: matchType === 0 ? KOMI : 0, // ⚠️大事
      },
      requestId,
    );
  };

  return { run, engineReady, cancelQueuedAnalysis };
};
