// active/hooks/screens/useEditableMoves.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 編集モードでの着手配列(editableMoves)の管理と、そこから導出される
// 盤面履歴(processed)・分岐点(branchIndex)・ボット由来の着手を担当する。
// 分析結果には一切触れない。
// ──────────────────────────────────────────────────

import { RecordType } from "@/src/active/types/record";
import {
  BoardSize,
  generateTerritoryBoard,
  getColorToMove,
  Grid,
  initBoard,
  isLegalMove,
  isNoOkiishi,
  movesToBoardHistory,
  PASS_GRID,
} from "expo-goband";
import { useMemo, useState } from "react";

export function useEditableMoves(record: RecordType) {
  const boardSize = record.board_size as BoardSize;

  const [isEditMode, setIsEditMode] = useState(false);
  const [editableMoves, setEditableMoves] = useState<Grid[]>(
    record.moves ?? [],
  );
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [branchIndex, setBranchIndex] = useState<number | null>(null);
  const [botMoveIndices, setBotMoveIndices] = useState<Set<number>>(new Set());

  const processed = useMemo(() => {
    const deadStones = record.dead_stones;
    const { boardHistory, agehamaHistory } = movesToBoardHistory(
      boardSize,
      record.match_type,
      editableMoves,
    );

    const territoryBoard = deadStones
      ? generateTerritoryBoard(
          boardSize,
          boardHistory.at(-1)!,
          deadStones,
          record.match_type,
          0,
          0,
        ).territoryBoard
      : Array.from({ length: boardSize }, () => Array(boardSize).fill(0));

    return {
      boardHistory,
      moves: editableMoves,
      agehamaHistory,
      territoryBoard,
    };
  }, [boardSize, record.match_type, record.dead_stones, editableMoves]);

  const maxIdx = Math.max(0, processed.boardHistory.length - 1);
  const [currentIndex, setCurrentIndex] = useState(maxIdx);







  // 🐱 その地点に今乗ってる石を、直近では誰が打ったか(人間/ボット)を表すMap。
  //    1地点につき1つの値しか持てないMapを使うことで、同じ座標が取り返しで
  //    複数回打たれても「人間かボットか」が矛盾なく1つに定まる。
  const editMarkers = useMemo(() => {
    if (!isEditMode || branchIndex === null) {
      return new Map<Grid, "human" | "bot">();
    }

    const currentBoard = processed.boardHistory[currentIndex] ?? [];

    const lastSourceByGrid = new Map<Grid, "human" | "bot">();
    for (let i = branchIndex; i < currentIndex; i++) {
      const move = editableMoves[i];
      if (move === undefined || move === PASS_GRID) continue;
      lastSourceByGrid.set(move, botMoveIndices.has(i) ? "bot" : "human");
    }

    const result = new Map<Grid, "human" | "bot">();
    currentBoard.forEach((goString, grid) => {
      if (!goString) return;
      const source = lastSourceByGrid.get(grid);
      if (source) result.set(grid, source);
    });

    return result;
  }, [
    editableMoves,
    isEditMode,
    branchIndex,
    processed.boardHistory,
    currentIndex,
    botMoveIndices,
  ]);











  // 🐱 着手を1手挿入する。合法性チェックのみ担当。分析のキックオフは呼び出し側(orchestrator)に任せる
  const tryPutStone = (grid: Grid, source: "human" | "bot") => {
    const currentBoard =
      processed.boardHistory[currentIndex] ?? initBoard(boardSize);
    const lastBoard =
      processed.boardHistory[currentIndex - 1] ?? initBoard(boardSize);
    const lastMove = editableMoves[currentIndex - 1] ?? null;
    const currentColor = getColorToMove(record.match_type, currentIndex);

    if (
      !isLegalMove(
        boardSize,
        grid,
        currentBoard,
        lastMove,
        currentColor,
        lastBoard,
      )
    ) {
      return null;
    }

    const newIndex = currentIndex;
    const newMoves = [...editableMoves.slice(0, currentIndex), grid];
    setEditableMoves(newMoves);
    setBranchIndex((prev) =>
      prev === null ? currentIndex : Math.min(prev, currentIndex),
    );
    setBotMoveIndices((prev) => {
      const pruned = new Set([...prev].filter((i) => i < newIndex));
      if (source === "bot") pruned.add(newIndex);
      return pruned;
    });
    setCurrentIndex(currentIndex + 1);

    const newBoard = movesToBoardHistory(
      boardSize,
      record.match_type,
      newMoves,
    ).boardHistory.at(-1)!;
    return { newIndex, newBoard, newMoves };
  };

  const enterEditMode = () => {
    setSavedIndex(currentIndex);
    setBranchIndex(null);
    setBotMoveIndices(new Set());
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setEditableMoves(record.moves ?? []);
    if (savedIndex !== null) {
      setCurrentIndex(savedIndex);
      setSavedIndex(null);
    }
    setBranchIndex(null);
    setBotMoveIndices(new Set());
    setIsEditMode(false);
  };

  const isNormalOrder = isNoOkiishi(record.match_type);
  const isCurrentMovePass =
    processed.moves.slice(0, currentIndex + 1)[currentIndex - 1] === PASS_GRID;
  const lastMoveWasBlack = isNormalOrder
    ? currentIndex % 2 === 1
    : currentIndex % 2 === 0;
  const isBlackPass = isCurrentMovePass && lastMoveWasBlack;
  const isWhitePass = isCurrentMovePass && !lastMoveWasBlack;
  const currentAgehama = processed.agehamaHistory[currentIndex] ?? {
    black: 0,
    white: 0,
  };

  return {
    boardSize,
    isEditMode,
    enterEditMode,
    exitEditMode,
    editableMoves,
    currentIndex,
    setCurrentIndex,
    maxIdx,
    branchIndex,
    processed,
    editMarkers,
    tryPutStone,
    isBlackPass,
    isWhitePass,
    currentAgehama,
  };
}
