// expo-goband/src/hooks/useGoGame.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中の盤面状態(board / boardHistory / agehamaHistory / moves / lastMove
// / currentIndex / territoryBoard)を一手に管理する、Go対局全般で使える汎用hook。
//
// 外に公開するのは「状態そのもの」よりも「何が起きたか」に近い操作にした:
//   - applyLegalMove   : 合法手チェックをした上で着手を反映する(非合法ならfalseを返す)
//   - applyTrustedMove : 合法性チェック済みの着手を無条件で反映する(ボット/相手/棋譜再生用)
//   - loadMoves        : 任意のmoves配列から状態を丸ごと再構築する(初期化/巻き戻し/resync兼用)
//   - computeTerritory : 終局時の地合い計算
//   - goToLatest       : リプレイ後、最新局面に戻る
//
// 通信対局固有の概念(サーバー送信失敗時の巻き戻し、resync)は、このhookが
// loadMovesという汎用プリミティブを提供することで、呼び出し側(useMatchSessionなど)
// で組み立ててもらう形にしている。このhook自身は「通信」も「対局の勝敗」も知らない。
//
// ─── ref vs state の使い分け ───
// render(JSXの中)で読まれる値は必ずstateにする(moves / territoryBoard など)。
// render中に読まれない、内部処理専用の値だけrefにする(boardRef / deadStonesRef)。
// 外部からrefへの直接代入(goBoard.xxxRef.current = ...)は禁止。更新はhookが公開するsetter経由で行う。
//
// ──────────────────────────────────────────────────

import { useRef, useState } from "react";
import { movesToBoardHistory } from "../logics/boardConverters";
import { getColorToMove } from "../logics/getColorToMove";
import {
  applyMove,
  cloneBoard,
  initBoard,
  isLegalMove,
} from "../logics/goLogics";
import {
  TerritoryBoard,
  generateTerritoryBoard,
} from "../logics/territoryLogics";
import {
  Agehama,
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  MatchType,
  PASS_GRID,
} from "../types/go";

type Args = {
  boardSize: BoardSize;
  matchType: MatchType;
  movesInt: number[]; // 初期化用の、着手前の手の履歴(-1がパス)
};

// moves配列(Grid[])から、盤面・履歴・現在の手番を一括で再構築する。
// 初期化・巻き戻し・resyncのすべてがこの1関数に集約される。
const buildStateFromMoves = (
  boardSize: BoardSize,
  matchType: MatchType,
  moves: Grid[],
) => {
  const { boardHistory, agehamaHistory } = movesToBoardHistory(
    boardSize,
    matchType,
    moves,
  );

  const lastMoveGrid = moves.length > 0 ? moves[moves.length - 1] : null;
  const currentTurn = getColorToMove(matchType, moves.length);

  return {
    board: boardHistory[boardHistory.length - 1],
    boardHistory,
    moves,
    agehamaHistory,
    currentTurn,
    lastMoveGrid,
  };
};

export function useGoGame({ boardSize, matchType, movesInt }: Args) {
  // ── 初期状態の計算は1回きりでいい ──────────────────────
  const [initialState] = useState(() =>
    buildStateFromMoves(boardSize, matchType, movesInt),
  );

  const boardRef = useRef<Board>(initialState.board);
  const boardHistoryRef = useRef<Board[]>(initialState.boardHistory);
  const [boardHistory, setBoardHistoryState] = useState<Board[]>(
    initialState.boardHistory,
  );

  const agehamaHistoryRef = useRef<Agehama[]>(initialState.agehamaHistory);
  const [agehamaHistory, setAgehamaHistoryState] = useState<Agehama[]>(
    initialState.agehamaHistory,
  );

  const movesRef = useRef<Grid[]>(initialState.moves);
  const [moves, setMovesState] = useState<Grid[]>(initialState.moves);

  const [lastMove, setLastMove] = useState<Grid | null>(
    initialState.lastMoveGrid,
  );

  const currentIndexRef = useRef<number>(initialState.moves.length);
  const [currentIndex, setCurrentIndex] = useState<number>(
    initialState.moves.length,
  );

  const [territoryBoard, setTerritoryBoard] = useState<TerritoryBoard>(
    Array.from({ length: boardSize }, () => Array(boardSize).fill(0)),
  );

  // deadStones(死に石): renderで一切使わない、
  // computeTerritory内部でのみ参照する値なので純粋なrefのままでよい。
  const deadStonesRef = useRef<Grid[]>([]);
  const setDeadStones = (deadStones: Grid[]) => {
    deadStonesRef.current = deadStones;
  };

  // ── 内部共通処理: 盤面/アゲハマ/手を1手分進める ──────────────
  const pushBoard = (board: Board) => {
    boardRef.current = board;
    boardHistoryRef.current = [...boardHistoryRef.current, board];
    setBoardHistoryState(boardHistoryRef.current);
  };

  const pushAgehama = (agehama: Agehama) => {
    agehamaHistoryRef.current = [...agehamaHistoryRef.current, agehama];
    setAgehamaHistoryState(agehamaHistoryRef.current);
  };

  const pushMove = (move: Grid) => {
    movesRef.current = [...movesRef.current, move];
    setMovesState(movesRef.current);
  };

  const advanceIndex = () => {
    currentIndexRef.current++;
    setCurrentIndex(currentIndexRef.current);
  };

  // ── 合法手チェックをした上で着手を反映する。非合法ならfalseを返して何もしない ──
  const applyLegalMove = (grid: Grid, color: Color): boolean => {
    if (
      !isLegalMove(
        boardSize,
        grid,
        boardRef.current,
        lastMove,
        color,
        boardHistoryRef.current[boardHistoryRef.current.length - 2] ??
          initBoard(boardSize),
      )
    ) {
      return false;
    }

    const { board: newBoard, agehama } = applyMove(
      boardSize,
      grid,
      cloneBoard(boardRef.current),
      color,
    );
    pushBoard(newBoard);
    const last =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    pushAgehama(
      color === BLACK
        ? { ...last, black: last.black + agehama }
        : { ...last, white: last.white + agehama },
    );
    setLastMove(grid);
    pushMove(grid);
    advanceIndex();
    return true;
  };

  // ── 合法性チェック済みの着手を無条件で反映する(ボット/相手/棋譜再生用) ──
  const applyTrustedMove = (grid: Grid, color: Color) => {
    advanceIndex();

    if (grid === PASS_GRID) {
      pushMove(PASS_GRID);
      setLastMove(PASS_GRID);
      pushBoard(cloneBoard(boardRef.current));
      const last =
        agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
      pushAgehama({ ...last });
      return;
    }

    const { board: newBoard, agehama } = applyMove(
      boardSize,
      grid,
      cloneBoard(boardRef.current),
      color,
    );
    pushBoard(newBoard);
    pushMove(grid);
    setLastMove(grid);
    const last =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    pushAgehama(
      color === BLACK
        ? { ...last, black: last.black + agehama }
        : { ...last, white: last.white + agehama },
    );
  };

  // ── 終局時の地合い計算(territoryBoard生成) ──────────
  // deadStonesRef(死石)が事前にセットされている前提。
  const computeTerritory = () => {
    const last =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    const territoryResult = generateTerritoryBoard(
      boardSize,
      boardRef.current,
      deadStonesRef.current,
      matchType,
      last.black,
      last.white,
    );
    return { ...territoryResult, deadStones: deadStonesRef.current };
  };

  // ── リプレイ後、最新局面に戻る ─────────────────────────
  const goToLatest = () => {
    const finalIndex = boardHistoryRef.current.length - 1;
    currentIndexRef.current = finalIndex;
    boardRef.current = boardHistoryRef.current[finalIndex];
  };

  // ── 任意のmoves配列から状態を丸ごと再構築する ──────────────
  // 「巻き戻し(末尾を1つ削ったmovesで再構築)」も
  // 「resync(サーバのmoves配列で丸ごと差し替え)」も、
  // どちらも"moves配列が変わったので状態を作り直す"という同じ操作でしかない。
  // 戻り値: 再構築後の手番(呼び出し側でclockのunfreezeなどに使う用)
  const loadMoves = (nextMoves: Grid[]): Color => {
    const rebuilt = buildStateFromMoves(boardSize, matchType, nextMoves);

    boardRef.current = rebuilt.board;
    boardHistoryRef.current = rebuilt.boardHistory;
    setBoardHistoryState(rebuilt.boardHistory);

    agehamaHistoryRef.current = rebuilt.agehamaHistory;
    setAgehamaHistoryState(rebuilt.agehamaHistory);

    movesRef.current = rebuilt.moves;
    setMovesState(rebuilt.moves);
    setLastMove(rebuilt.lastMoveGrid);

    currentIndexRef.current = rebuilt.moves.length;
    setCurrentIndex(rebuilt.moves.length);

    return rebuilt.currentTurn;
  };

  return {
    boardRef,
    boardHistory,
    boardHistoryRef,
    agehamaHistory,
    moves,
    movesRef,
    lastMove,
    currentIndex,
    setCurrentIndex,
    territoryBoard,
    setTerritoryBoard,
    setDeadStones,
    applyLegalMove,
    applyTrustedMove,
    computeTerritory,
    goToLatest,
    initialTurn: initialState.currentTurn,
    loadMoves,
  };
}