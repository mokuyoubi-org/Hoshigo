import { useMemo, useState } from "react";
import {
  BoardSize,
  generateTerritoryBoard,
  Grid,
  isNoOkiishi,
  movesToBoardHistory,
  PASS_GRID,
} from "expo-goband";
import { RecordType } from "@/src/active/types/record";

export function useEditableGoBoard(record: RecordType) {
  const boardSize = record.board_size as BoardSize;

  // 編集モードState & 着手配列
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableMoves, setEditableMoves] = useState<Grid[]>(
    record.moves ?? [],
  );

  // 🐱 リプレイモードで見ていたインデックスを記憶しておくためのState
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  // 🐱 実際に「編集アクション」が起きた最も早いインデックス(分岐点)
  const [branchIndex, setBranchIndex] = useState<number | null>(null);

  // 盤面データ計算
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

  // 🐱 現在表示されている盤面の石が「編集中に打たれた石か」を判定する
  const editedPoints = useMemo(() => {
    if (!isEditMode || branchIndex === null) return [];

    const currentBoard = processed.boardHistory[currentIndex] ?? [];

    const editedMovesSet = new Set<Grid>();
    for (let i = branchIndex; i < currentIndex; i++) {
      const move = editableMoves[i];
      if (move !== undefined && move !== PASS_GRID) {
        editedMovesSet.add(move);
      }
    }

    const edited: Grid[] = [];
    currentBoard.forEach((goString, grid) => {
      if (goString && editedMovesSet.has(grid)) {
        edited.push(grid);
      }
    });

    return edited;
  }, [editableMoves, isEditMode, branchIndex, processed.boardHistory, currentIndex]);

  // 🐱 編集モード切替
  const toggleEditMode = () => {
    if (!isEditMode) {
      // 【リプレイ ➔ 編集モードへ行く時】
      setSavedIndex(currentIndex);
      setBranchIndex(null); // まだ何も編集してない状態からスタート
      setIsEditMode(true);
    } else {
      // 【編集 ➔ リプレイモードに戻る時】
      setEditableMoves(record.moves ?? []);
      if (savedIndex !== null) {
        setCurrentIndex(savedIndex);
        setSavedIndex(null);
      }
      setBranchIndex(null);
      setIsEditMode(false);
    }
  };

  // 編集モードでの着手
  const handlePutStone = (grid: Grid) => {
    if (!isEditMode) return;
    const newMoves = [...editableMoves.slice(0, currentIndex), grid];
    setEditableMoves(newMoves);
    // 🐱 今回打った地点と、これまでの分岐点の、早い方を採用
    setBranchIndex((prev) =>
      prev === null ? currentIndex : Math.min(prev, currentIndex),
    );
    setCurrentIndex(currentIndex + 1);
  };

  const isCurrentMovePass =
    processed.moves.slice(0, currentIndex + 1)[currentIndex - 1] ===
    PASS_GRID;
  const isNormalOrder = isNoOkiishi(record.match_type);
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
    toggleEditMode,
    currentIndex,
    setCurrentIndex,
    maxIdx,
    processed,
    editedPoints,
    handlePutStone,
    isBlackPass,
    isWhitePass,
    currentAgehama,
  };
}