// @/src/active/hooks/useGoBoardState.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中の盤面状態(board / boardHistory / agehamaHistory / moves / lastMove
// / currentIndex / territoryBoard / ownership)を一手に管理する。
//
// 外に公開するのは「状態そのもの」よりも「何が起きたか」に近い操作にした:
//   - applyOwnMove   : 自分が着手した(合法手チェック込み)
//   - revertLastOwnMove : 通信失敗などで直前の自分の着手を取り消す
//   - applyRemoteMove   : 相手 or ボットの着手がbroadcastで届いた
//   - computeTerritory  : 終局時の地合い計算
//   - goToLatest        : リプレイ後、最新局面に戻る
//
// これにより、Playing.tsx側は「盤面の中身をどう更新するか」を知らなくてよくなる。
// ──────────────────────────────────────────────────

import {
  applyMove,
  cloneBoard,
  initBoard,
  isLegalMove,
} from "@/src/active/logics/goLogics";
import {
  generateDeadStones,
  generateOkigoBoard,
  generateTerritoryBoard,
  TerritoryBoard,
} from "@/src/active/logics/matchLogics";
import { Agehama } from "@/src/active/types/matchTypes";
import { FloatArray } from "@/src/stable/services/web-katrain/types";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  MatchType,
  PASS_GRID,
  WHITE,
} from "@/src/stable/types/goTypes";
import { useRef, useState } from "react";

type Args = {
  boardSize: BoardSize;
  matchType: MatchType;
  movesInt: number[]; // paramsから来る、着手前の手の履歴(-1がパス)
};

// paramsのmovesInt(数値配列)から、初期盤面・履歴を再構築する。
// Playing.tsxにあったbuildInitialStateをそのまま移植。
const buildInitialState = ({ boardSize, matchType, movesInt }: Args) => {
  let board = generateOkigoBoard(matchType, boardSize);

  const firstTurn: Color = matchType >= 2 ? WHITE : BLACK;
  const colors: Color[] = firstTurn === BLACK ? [BLACK, WHITE] : [WHITE, BLACK];

  const agehmHist: Agehama[] = [{ black: 0, white: 0 }];
  const boardHistory: Board[] = [cloneBoard(board)];
  const moves: Grid[] = [];
  let lastMoveGrid: Grid | null = null;

  for (let i = 0; i < movesInt.length; i++) {
    const grid = movesInt[i];
    const color = colors[i % 2];
    const last = agehmHist[agehmHist.length - 1];
    if (grid === -1) {
      moves.push(PASS_GRID);
      boardHistory.push(cloneBoard(board));
      agehmHist.push({ ...last });
      lastMoveGrid = PASS_GRID;
    } else {
      const { board: newBoard, agehama } = applyMove(
        boardSize,
        grid,
        cloneBoard(board),
        color,
      );
      board = newBoard;
      boardHistory.push(cloneBoard(board));
      moves.push(grid);
      agehmHist.push(
        color === BLACK
          ? { ...last, black: last.black + agehama }
          : { ...last, white: last.white + agehama },
      );
      lastMoveGrid = grid;
    }
  }

  const currentTurn: Color = colors[movesInt.length % 2];

  return {
    board,
    boardHistory,
    moves,
    agehamaHistory: agehmHist,
    currentTurn,
    lastMoveGrid,
  };
};

export function useGoBoardState({ boardSize, matchType, movesInt }: Args) {
  const initialStateRef = useRef(
    buildInitialState({ boardSize, matchType, movesInt }),
  );
  const initialState = initialStateRef.current;

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
  const [lastMove, setLastMove] = useState<Grid | null>(
    initialState.lastMoveGrid,
  );

  const currentIndexRef = useRef<number>(initialState.moves.length);
  // ※ setCurrentIndexはそのままリプレイ用に公開する(refとは同期させない)。
  //   理由: ReplayControlsでの巻き戻し操作は「見た目だけ」の操作であって、
  //   進行中の対局の手数(currentIndexRef)には影響させたくないため。
  const [currentIndex, setCurrentIndex] = useState<number>(
    initialState.moves.length,
  );

  const territoryBoardRef = useRef<TerritoryBoard>(
    Array.from({ length: boardSize }, () => Array(boardSize).fill(0)),
  );
  const currentOwnershipRef = useRef<FloatArray>([]);

  // ── 内部共通処理: 盤面/アゲハマ/手数を1手分進める ──────────────
  const pushBoard = (board: Board) => {
    boardRef.current = board;
    boardHistoryRef.current = [...boardHistoryRef.current, board];
    setBoardHistoryState(boardHistoryRef.current);
  };

  const pushAgehama = (agehama: Agehama) => {
    agehamaHistoryRef.current = [...agehamaHistoryRef.current, agehama];
    setAgehamaHistoryState(agehamaHistoryRef.current);
  };

  const advanceIndex = () => {
    currentIndexRef.current++;
    setCurrentIndex(currentIndexRef.current);
  };

  // ── 自分の着手を反映する。非合法手ならfalseを返して何もしない ──────
  const applyOwnMove = (grid: Grid, color: Color): boolean => {
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
    movesRef.current = [...movesRef.current, grid];
    advanceIndex();
    return true;
  };

  // ── 通信失敗時、直前の自分の着手を取り消す ────────────────
  const revertLastOwnMove = () => {
    movesRef.current = movesRef.current.slice(0, -1);
    currentIndexRef.current--;
    setCurrentIndex(currentIndexRef.current);

    boardHistoryRef.current = boardHistoryRef.current.slice(0, -1);
    setBoardHistoryState(boardHistoryRef.current);

    agehamaHistoryRef.current = agehamaHistoryRef.current.slice(0, -1);
    setAgehamaHistoryState(agehamaHistoryRef.current);

    boardRef.current =
      boardHistoryRef.current[boardHistoryRef.current.length - 1];
  };

  // ── 相手 or ボットの着手がbroadcastで届いた時に反映する ─────────
  const applyRemoteMove = (grid: Grid, color: Color) => {
    advanceIndex();

    if (grid === PASS_GRID) {
      movesRef.current = [...movesRef.current, PASS_GRID];
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
    movesRef.current = [...movesRef.current, grid];
    setLastMove(grid);
    const last =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    pushAgehama(
      color === BLACK
        ? { ...last, black: last.black + agehama }
        : { ...last, white: last.white + agehama },
    );
  };

  // ── 終局時の地合い計算(死石判定 + territoryBoard生成) ──────────
  // currentOwnershipRef(KataGoの分析結果)が必要なので、事前にセットされている前提。
  const computeTerritory = () => {
    const last =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    const deadStones = generateDeadStones(
      boardRef.current,
      currentOwnershipRef.current,
      boardSize,
    );
    return generateTerritoryBoard(
      boardSize,
      boardRef.current,
      deadStones,
      matchType,
      last.black,
      last.white,
    );
  };

  // ── リプレイ後、最新局面に戻る ─────────────────────────
  // ※ 元の実装と同じく、refのみ更新してstate(currentIndex)は更新しない。
  //   (結果モーダルを開き直した時にrender用stateとズレる可能性が元からあるが、
  //   今回はロジックの移植に専念し、挙動は変えていない)
  const goToLatest = () => {
    const finalIndex = boardHistoryRef.current.length - 1;
    currentIndexRef.current = finalIndex;
    boardRef.current = boardHistoryRef.current[finalIndex];
  };

  return {
    boardRef,
    boardHistory,
    boardHistoryRef,
    agehamaHistory,
    movesRef,
    lastMove,
    currentIndex,
    setCurrentIndex,
    territoryBoardRef,
    currentOwnershipRef,
    applyOwnMove,
    revertLastOwnMove,
    applyRemoteMove,
    computeTerritory,
    goToLatest,
    initialTurn: initialState.currentTurn,
  };
}
