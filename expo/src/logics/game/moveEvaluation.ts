// moveEvaluation.ts
//
// 実際に打たれた手が良手だったか悪手だったかを、前後のroot winRateの
// 差分(打った本人視点)から判定する。目数(scoreLead)ではなくwinRateを
// 主軸にしているのは、両端で圧縮されるという弱点はあるものの、
// 「勝敗にどれだけ影響したか」という本質に一番近い指標だから。
//
// perMove[i]は「i手目を打つ【前】の局面」の解析結果。なのでi手目の効果はperMove[i+1](打った後)
// とperMove[i](打つ前)の差で測れる。
//
// 良手:
//   1. winRateが1ポイント以上上がった
//   2. scoreleadが1ポイント以上上がった
//   3. 最善手だった
// 悪手:
//   1: winRateが5ポイント以上下がった
//   2. scoreLeadが5ポイント以上下がった
// ──────────────────────────────────────────────────

import {
  BoardSize,
  Grid,
  MatchType,
  RecordAnalysis,
  isNoOkiishi,
  makeGrid,
} from "go-core";

type MoveEvaluation = "good" | "bad" | undefined;

const GOOD_THRESHOLD_WIN_RATE = 1;
const BAD_THRESHOLD_WIN_RATE = -5;

const GOOD_THRESHOLD_SCORE_LEAD = 1;
const BAD_THRESHOLD_SCORE_LEAD = -5;

// katagoがbadと判断するものの、人間にとっては自然な初手はbad扱いから救済する。
const isPermittedFirstMove = (move: number, boardSize: BoardSize): boolean => {
  if (boardSize === 5) {
    return [6, 7, 8, 11, 12, 13, 16, 17, 18].includes(move);
  }
  if (boardSize === 9) {
    return [
      20, 21, 22, 23, 24, 29, 30, 31, 32, 33, 38, 39, 40, 41, 42, 47, 48, 49,
      50, 51, 56, 57, 58, 59, 60,
    ].includes(move);
  }
  if (boardSize === 13) {
    return [
      28, 29, 30, 34, 35, 36, 41, 42, 48, 49, 54, 62, 106, 114, 119, 120, 126,
      127, 132, 133, 134, 138, 139, 140,
    ].includes(move);
  }
  if (boardSize === 19) {
    return [
      40, 41, 42, 52, 53, 54, 59, 60, 72, 73, 78, 92, 268, 282, 287, 288, 300,
      301, 306, 307, 308, 318, 319, 320,
    ].includes(move);
  }
  return false;
};

// index i = record.moves[i] を打った本人にとっての評価
export const computeMoveEvaluations = (
  analysis: RecordAnalysis | null | undefined,
  moves: number[] | undefined,
  boardSize: BoardSize,
  matchType: MatchType,
): MoveEvaluation[] => {
  const isNormalOrder = isNoOkiishi(matchType);
  const totalMoves = moves?.length ?? 0;
  const result: MoveEvaluation[] = [];

  for (let i = 0; i < totalMoves; i++) {
    const before = analysis?.perMove[i];
    const after = analysis?.perMove[i + 1];

    if (!before || !after) {
      result.push(undefined);
      continue;
    }

    const isBlackTurn = isNormalOrder ? i % 2 === 0 : i % 2 === 1;
    const winRateDelta = isBlackTurn
      ? after.winRate - before.winRate
      : before.winRate - after.winRate;

    const scoreLeadDelta = isBlackTurn
      ? after.scoreLead - before.scoreLead
      : before.scoreLead - after.scoreLead;

    const playedGrid = moves![i];
    const topCandidate = before.candidates[0];

    // // index 0の候補が存在し、かつパス（x/yが-1）でない場合のみチェックする
    const wasTopCandidate =
      topCandidate !== undefined &&
      makeGrid(topCandidate.y, topCandidate.x, boardSize) === playedGrid;

    // 悪手判定で代替候補として提示できる手が存在するか
    // （candidateGridsForMoveの「候補なし/パス」判定と揃える）
    const hasReplacementCandidate =
      topCandidate !== undefined &&
      topCandidate.x !== -1 &&
      topCandidate.y !== -1;

    // 良手判定が先
    if (
      winRateDelta >= GOOD_THRESHOLD_WIN_RATE ||
      scoreLeadDelta >= GOOD_THRESHOLD_SCORE_LEAD ||
      wasTopCandidate
    ) {
      result.push("good");
    }
    // 悪手判定が後（代替候補を提示できない場合はbadにしない）
    else if (
      moves &&
      (winRateDelta <= BAD_THRESHOLD_WIN_RATE ||
        scoreLeadDelta <= BAD_THRESHOLD_SCORE_LEAD) &&
      hasReplacementCandidate &&
      ((!isPermittedFirstMove(moves[0], boardSize) && i === 0) || i !== 0) // 初手
    ) {
      result.push("bad");
    } else {
      result.push(undefined);
    }
  }

  return result;
};
// 悪手だった手について、代わりにどこが候補だったかをGrid配列で返す。
// analyzeBoard.ts側で既に上位5件・visits順に絞られている

export const candidateGridsForMove = (
  analysis: RecordAnalysis | null | undefined,
  moveIndex: number,
  boardSize: BoardSize,
): Grid[] => {
  const entry = analysis?.perMove[moveIndex];
  if (!entry) return [];

  // 先頭（index 0）の候補を取得
  const topCandidate = entry.candidates[0];

  // 候補が存在しない、またはパス（x/yが-1）の場合は空配列を返す
  if (!topCandidate || topCandidate.x === -1 || topCandidate.y === -1) {
    return [];
  }

  // 1番上の手だけを盤面グリッドに変換して返す（要素数1の配列）
  return [makeGrid(topCandidate.y, topCandidate.x, boardSize)];
};
