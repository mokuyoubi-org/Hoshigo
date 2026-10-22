// packages/expo-katago/src/hooks/useKataGo.ts
// 「Board / Grid[]（アプリで普段使っている形）を渡すと、KataGoの解析結果
// (AnalyzeResult)が返ってくる」という、盤面フォーマットの変換に徹した
// 薄い層。
//
// WebViewとの通信はKataGoEngineContextのrunAnalysisが引き受けている。
// 行列の整理はここでもやらない(使う側の責務)。推論中に呼ぶと null が返る。
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
import { AnalyzeResultFields, AnalyzeResultFor } from "../types/types";

type KataGoParams<F extends AnalyzeResultFields> = {
  board: Board;
  movesSoFar: Grid[];
  currentPlayer: Color;
  boardSize: BoardSize;
  matchType: MatchType;
  fields: F;
};

export const useKataGo = () => {
  const { runAnalysis, engineReady, isAnalyzing } = useKataGoEngine();

  const run = async <const F extends AnalyzeResultFields>({
    board,
    movesSoFar,
    currentPlayer,
    boardSize,
    matchType,
    fields,
  }: KataGoParams<F>): Promise<AnalyzeResultFor<F> | null> => {
    return runAnalysis({
      board: boardToBoard2D(board, boardSize),
      moves: movesToMoveObjects(movesSoFar, boardSize, matchType),
      currentPlayer,
      boardSize,
      fields,
      komi: matchType === 0 ? KOMI : 0, // ⚠️大事
    });
  };
  return { run, engineReady, isAnalyzing };
};
