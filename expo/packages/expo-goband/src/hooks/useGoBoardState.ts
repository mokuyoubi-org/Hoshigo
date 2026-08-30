// useGoBoardState.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中の盤面状態(board / boardHistory / agehamaHistory / moves / lastMove
// / currentIndex / territoryBoard)を一手に管理する。
//
// 外に公開するのは「状態そのもの」よりも「何が起きたか」に近い操作にした:
//   - applyOwnMove   : 自分が着手した(合法手チェック込み)
//   - revertLastOwnMove : 通信失敗などで直前の自分の着手を取り消す
//   - applyRemoteMove   : 相手 or ボットの着手がbroadcastで届いた
//   - computeTerritory  : 終局時の地合い計算
//   - goToLatest        : リプレイ後、最新局面に戻る
//
// これにより、Playing.tsx側は「盤面の中身をどう更新するか」を知らなくてよくなる。
//
// ─── ref vs state の使い分け ───
// render(JSXの中)で読まれる値は必ずstateにする(moves / territoryBoard など)。
// render中に読まれない、内部処理専用の値だけrefにする(boardRef / deadStonesRef)。
// 外部からrefへの直接代入(goBoard.xxxRef.current = ...)はESLintの
// react-hooks/immutability に引っかかるため禁止。更新はhookが公開するsetter経由で行う。
//
// ──────────────────────────────────────────────────

import { useRef, useState } from "react";
import {
  applyMove,
  cloneBoard,
  initBoard,
  isLegalMove,
} from "../logics/goLogics";
import { generateOkigoBoard } from "../logics/okigoLogics";
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
  WHITE,
} from "../types/go";

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
  // ── 初期状態の計算は1回きりでいい ──────────────────────
  // 以前はuseRefで擬似的なlazy-initを行っていたが、これはrender中に
  // ref.currentを読むことになりreact-hooks/refsに違反する。
  // 「render前に一度だけ計算してそれ以降は変えない値」はuseStateの
  // lazy initializerが正しい表現。
  const [initialState] = useState(() =>
    buildInitialState({ boardSize, matchType, movesInt }),
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

  // moves: GameScreen側でrender(moveHistoryの計算・GoBoardへのprops渡し)に
  // 使われるので、boardHistory/agehamaHistoryと同じく ref + state のペアにする。
  const movesRef = useRef<Grid[]>(initialState.moves);
  const [moves, setMovesState] = useState<Grid[]>(initialState.moves);

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

  // territoryBoard: GameScreen側でGoBoardのpropsとして直接renderに使われるため、
  // ref単体ではなくstateとして持つ(以前はrefで外部からrefに直接代入していたため
  // react-hooks/immutability + react-hooks/refs 両方に違反していた)。
  const [territoryBoard, setTerritoryBoard] = useState<TerritoryBoard>(
    Array.from({ length: boardSize }, () => Array(boardSize).fill(0)),
  );

  // deadStones(死に石): renderで一切使わない、
  // computeTerritory内部でのみ参照する値なので純粋なrefのままでよい。
  // ただし外部から直接 .current = ... と書き換えるのはimmutability違反になるため、
  // 更新は setDeadStones 経由に限定し、refそのものは外に公開しない。
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
    pushMove(grid);
    advanceIndex();
    return true;
  };

  // ── 通信失敗時、直前の自分の着手を取り消す ────────────────
  const revertLastOwnMove = () => {
    movesRef.current = movesRef.current.slice(0, -1);
    setMovesState(movesRef.current);

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
  // ※ ここではterritoryBoard stateへの反映はしない(純粋な計算のみ)。
  //   game_double_pass のようにdeadStonesだけ使いたい呼び出し元もあるため、
  //   実際にstateへ反映するかどうかは呼び出し元(useMatchSession)が判断する。
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
  // ※ 元の実装と同じく、refのみ更新してstate(currentIndex)は更新しない。
  //   (結果モーダルを開き直した時にrender用stateとズレる可能性が元からあるが、
  //   今回はロジックの移植に専念し、挙動は変えていない)
  const goToLatest = () => {
    const finalIndex = boardHistoryRef.current.length - 1;
    currentIndexRef.current = finalIndex;
    boardRef.current = boardHistoryRef.current[finalIndex];
  };

  // ── サーバのmoves配列で盤面を丸ごと再構築する(取りこぼし検出時のresync用) ──
  // 戻り値: サーバ視点での現在の手番(呼び出し側でclockのsetTurnに渡す用)
  const resyncFromMoves = (serverMovesInt: number[]): Color => {
    const rebuilt = buildInitialState({
      boardSize,
      matchType,
      movesInt: serverMovesInt,
    });

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
    applyOwnMove,
    revertLastOwnMove,
    applyRemoteMove,
    computeTerritory,
    goToLatest,
    initialTurn: initialState.currentTurn,
    resyncFromMoves,
  };
}
