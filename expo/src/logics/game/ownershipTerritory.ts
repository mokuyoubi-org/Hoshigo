// ownershipTerritory.ts
//
// ─── この関数の責務 ───────────────────────────────────
// 「この局面の ownership(分析キャッシュに保存されている地の予想)があれば、
//  それを地の盤面に変換して返す。なければ null を返す」だけ。
//
// 地の盤面をもらう唯一の窓口。確定した終局局面のownershipは、保存時に
// goscorerの結果(1 / 0 / -1)で上書き済みなので、確定か暫定かを
// 呼び出し側が気にする必要はない。
//
// 画面側は、null かどうかだけを見て「地を出す/出さない」を決めればいい。
// 「ない」は必ず null で表す(全部0の盤面で「ない」を表さない)。
// ownershipが空の配列(分析が無い局面の既定値)も「ない」として扱う。
// ──────────────────────────────────────────────────

import {
  Board,
  BoardSize,
  ownershipToTerritoryBoard,
  RecordAnalysis,
  TerritoryBoard,
} from "go-core";

export const getOwnershipTerritoryBoard = (
  boardSize: BoardSize,
  board: Board | undefined,
  analysis: RecordAnalysis | null | undefined,
  index: number,
): TerritoryBoard | null => {
  const ownership = analysis?.perMove?.[index]?.ownership;
  if (!ownership || ownership.length === 0 || !board) return null;
  return ownershipToTerritoryBoard(boardSize, board, ownership);
};
