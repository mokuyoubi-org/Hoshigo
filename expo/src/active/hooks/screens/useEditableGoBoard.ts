import { useMemo, useState } from "react";
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

  // 🐱 どのindexの着手がボット由来かを記録するSet(赤/青の描き分け用)
  const [botMoveIndices, setBotMoveIndices] = useState<Set<number>>(
    new Set(),
  );

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

  // 🐱 現在表示されている盤面の石が「編集中に打たれた石か」を、人間由来/ボット由来に分けて判定する
  const { editedPoints, botMovePoints } = useMemo(() => {
    if (!isEditMode || branchIndex === null) {
      return { editedPoints: [] as Grid[], botMovePoints: [] as Grid[] };
    }

    const currentBoard = processed.boardHistory[currentIndex] ?? [];

    const humanMovesSet = new Set<Grid>();
    const botMovesSet = new Set<Grid>();
    for (let i = branchIndex; i < currentIndex; i++) {
      const move = editableMoves[i];
      if (move === undefined || move === PASS_GRID) continue;
      (botMoveIndices.has(i) ? botMovesSet : humanMovesSet).add(move);
    }

    const edited: Grid[] = [];
    const botMoves: Grid[] = [];
    currentBoard.forEach((goString, grid) => {
      if (!goString) return;
      if (humanMovesSet.has(grid)) edited.push(grid);
      if (botMovesSet.has(grid)) botMoves.push(grid);
    });

    return { editedPoints: edited, botMovePoints: botMoves };
  }, [
    editableMoves,
    isEditMode,
    branchIndex,
    processed.boardHistory,
    currentIndex,
    botMoveIndices,
  ]);

  // 🐱 編集モード切替
  const toggleEditMode = () => {
    if (!isEditMode) {
      // 【リプレイ ➔ 編集モードへ行く時】
      setSavedIndex(currentIndex);
      setBranchIndex(null); // まだ何も編集してない状態からスタート
      setBotMoveIndices(new Set());
      setIsEditMode(true);
    } else {
      // 【編集 ➔ リプレイモードに戻る時】
      setEditableMoves(record.moves ?? []);
      if (savedIndex !== null) {
        setCurrentIndex(savedIndex);
        setSavedIndex(null);
      }
      setBranchIndex(null);
      setBotMoveIndices(new Set());
      setIsEditMode(false);
    }
  };

  // 編集モードでの着手(人間のタップ or ボットの提案、どちらもここが入口)
const handlePutStone = (grid: Grid, source: "human" | "bot" = "human") => {
  if (!isEditMode) return;

  // 🐱 非合法手(既に石がある/自殺手/コウ)は弾く。人間のタップ・ボットの提案どちらも通る唯一の入口なので、
  //    ここでチェックしておけば盤面が壊れることはない。
  const currentBoard = processed.boardHistory[currentIndex] ?? initBoard(boardSize);
  const lastBoard = processed.boardHistory[currentIndex - 1] ?? initBoard(boardSize);
  const lastMove = editableMoves[currentIndex - 1] ?? null;
  const currentColor = getColorToMove(record.match_type, currentIndex);

  if (
    !isLegalMove(boardSize, grid, currentBoard, lastMove, currentColor, lastBoard)
  ) {
    return;
  }

  const newIndex = currentIndex; // 今回の着手が入るindex
  const newMoves = [...editableMoves.slice(0, currentIndex), grid];
  setEditableMoves(newMoves);
  // 🐱 今回打った地点と、これまでの分岐点の、早い方を採用
  setBranchIndex((prev) =>
    prev === null ? currentIndex : Math.min(prev, currentIndex),
  );

  // 🐱 未来側(今回のsliceで消える範囲)の古いボット印は掃除してから、必要なら追加
  setBotMoveIndices((prev) => {
    const pruned = new Set([...prev].filter((i) => i < newIndex));
    if (source === "bot") pruned.add(newIndex);
    return pruned;
  });

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
    botMovePoints,
    handlePutStone,
    isBlackPass,
    isWhitePass,
    currentAgehama,
  };
}