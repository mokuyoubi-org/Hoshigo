// active/hooks/screens/useReplayMoveEvaluation.ts
//
// ─── このhookの責務 ───────────────────────────────────
// リプレイモードでの「直前の手は好手/悪手か」の判定と、悪手時の代替候補
// 手の算出を担当する。編集モードでの分岐先には適用しない。
// ──────────────────────────────────────────────────

import { BoardSize } from "@/packages/go-core/src/types/go";
import { RecordType } from "@/src/active/types/record";
import {
  candidateGridsForMove,
  computeMoveEvaluations,
} from "@/src/stable/logics/moveEvaluation";
import { useMemo } from "react";

export function useReplayMoveEvaluation(
  record: RecordType,
  boardSize: BoardSize,
  currentIndex: number,
  isEditMode: boolean,
) {
  const moveEvaluations = useMemo(
    () =>
      computeMoveEvaluations(
        record.analysis,
        record.moves,
        boardSize,
        record.match_type,
      ),
    [record.analysis, record.moves, boardSize, record.match_type],
  );

  const lastMoveIndex = currentIndex - 1;
  const lastMoveEvaluation =
    !isEditMode && lastMoveIndex >= 0
      ? moveEvaluations[lastMoveIndex]
      : undefined;
  const lastMoveGrid =
    !isEditMode && lastMoveIndex >= 0
      ? (record.moves?.[lastMoveIndex] ?? null)
      : null;

  const candidatePoints = useMemo(() => {
    if (lastMoveEvaluation !== "bad" || lastMoveIndex < 0) return [];
    return candidateGridsForMove(record.analysis, lastMoveIndex, boardSize);
  }, [lastMoveEvaluation, lastMoveIndex, record.analysis, boardSize]);

  return { lastMoveEvaluation, lastMoveGrid, candidatePoints };
}
