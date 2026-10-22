// goLogics.ts

// 【ファイル全体の責務】
// 囲碁のルール判定や盤面の操作（石を置く・合法手チェックなど）を行うロジック部分。
// 座標はすべて `0`〜`80` の数値インデックス（1次元）で計算します。

import {
  BLACK,
  Board,
  BoardSize,
  Color,
  GoString,
  Grid,
  PASS_GRID,
  WHITE,
} from "../types/go";

// 上下左右の隣接点インデックスを取得する
const getNeighbors = (grid: Grid, boardSize: BoardSize): Grid[] => {
  const row = Math.floor(grid / boardSize);
  const col = grid % boardSize;
  const neighbors: Grid[] = [];

  if (row > 0) neighbors.push(grid - boardSize); // 上
  if (row < boardSize - 1) neighbors.push(grid + boardSize); // 下
  if (col > 0) neighbors.push(grid - 1); // 左
  if (col < boardSize - 1) neighbors.push(grid + 1); // 右

  return neighbors;
};

// 空点かどうか
const isEmptyGrid = (grid: Grid, board: Board): boolean => board[grid] === null;

// コウ判定
const isKoViolation = (
  boardSize: BoardSize,
  currentColor: Color,
  grid: Grid,
  lastMove: Grid,
  board: Board,
  lastBoard: Board,
): boolean => {
  // 打とうとしているマスの隣にある相手の「連（石グループ）」を収集するセット
  const oppStrings = new Set<GoString>();

  // 上下左右の隣接マスを順番にチェック
  for (const neighbor of getNeighbors(grid, boardSize)) {
    const neighborString = board[neighbor];
    // 空点や自分の石がある場合は、コウ（1石だけ取る形）になり得ないのでコウ違反ではない
    if (neighborString === null) return false;
    if (neighborString.color === currentColor) return false;

    oppStrings.add(neighborString);
  }

  // 隣接する相手の連のうち、「石が1個」かつ「呼吸点が残り1個（アタリ状態）」のものを抽出
  const oneStoneOneLiberty: GoString[] = [];
  for (const oppString of oppStrings) {
    if (oppString.stones.size === 1 && oppString.liberties.size === 1) {
      oneStoneOneLiberty.push(oppString);
    }
  }

  // 対象となる相手の1個石の座標を取得
  const lastStone = [...(oneStoneOneLiberty[0]?.stones ?? [])][0];

  // 以下の条件をすべて満たす場合は「コウ違反」と判定
  // 1. 取り返せる相手の石(構成石・呼吸点がともに1のもの)がちょうど1個だけ存在する
  // 2. その相手の石の位置が、1手前に相手が打った位置（lastMove）と一致する
  // 3. 1手前の盤面（lastBoard）で、現在打とうとしている位置に自分の石が存在していた（＝さっき取られた石の位置）
  if (
    oneStoneOneLiberty.length === 1 &&
    lastStone === lastMove &&
    lastBoard[grid]?.color === currentColor
  ) {
    return true; // コウ違反（同形反復のため着手不可）
  }
  return false;
};

/**  コウで打てない場所が、盤上にあるかどうか */
export const hasKoPoint = (
  boardSize: BoardSize,
  currentColor: Color,
  lastMove: Grid | null,
  board: Board,
  lastBoard: Board,
): boolean => {
  // 1手前がない・パスだった場合は、コウになりようがない
  if (lastMove === null || lastMove === PASS_GRID) return false;

  for (let grid = 0; grid < board.length; grid++) {
    if (!isEmptyGrid(grid, board)) continue;
    if (
      isKoViolation(boardSize, currentColor, grid, lastMove, board, lastBoard)
    ) {
      return true;
    }
  }
  return false;
};

// 自殺手判定
const isSelfCapture = (
  boardSize: BoardSize,
  grid: Grid,
  board: Board,
  currentColor: Color,
): boolean => {
  const myStringSet = new Set<GoString>();
  const oppStringSet = new Set<GoString>();

  for (const neighbor of getNeighbors(grid, boardSize)) {
    const neighborString = board[neighbor];
    if (neighborString === null) return false;

    if (neighborString.color === currentColor) {
      myStringSet.add(neighborString);
    } else {
      oppStringSet.add(neighborString);
    }
  }

  for (const oppString of oppStringSet) {
    if (oppString.liberties.size === 1) return false;
  }

  for (const myString of myStringSet) {
    if (myString.liberties.size >= 2) return false;
  }

  return true;
};

// Set合体ヘルパー
const mergeStringSets = (first: Set<Grid>, second: Set<Grid>): Set<Grid> =>
  new Set([...first, ...second]);

// 連を盤から取り除く
const removeGoString = (
  goString: GoString,
  board: Board,
  boardSize: BoardSize,
) => {
  for (const stoneKey of goString.stones) {
    for (const neighbor of getNeighbors(stoneKey, boardSize)) {
      const neighborString = board[neighbor];
      if (neighborString && neighborString.color !== goString.color) {
        neighborString.liberties.add(stoneKey);
      }
    }
    board[stoneKey] = null;
  }
};

// 呼吸点を減らす
const reduceLiberty = (
  goString: GoString,
  board: Board,
  playedGrid: Grid,
  boardSize: BoardSize,
): number => {
  // ← 返り値の型を明示
  goString.liberties.delete(playedGrid);

  if (goString.liberties.size === 0) {
    const agehamaCount = goString.stones.size;
    removeGoString(goString, board, boardSize);
    return agehamaCount;
  }
  return 0; // ← 明示的に0を返す
};

// 連を合体する
const mergeGoStrings = (
  playedGrid: Grid,
  baseString: GoString,
  targetString: GoString,
  board: Board,
): GoString => {
  const mergedGoStones = mergeStringSets(
    baseString.stones,
    targetString.stones,
  );

  const mergedLiberties = mergeStringSets(
    baseString.liberties,
    targetString.liberties,
  );

  mergedLiberties.delete(playedGrid);

  const mergedGoString: GoString = {
    color: baseString.color,
    stones: mergedGoStones,
    liberties: mergedLiberties,
  };

  for (const stone of mergedGoStones) {
    board[stone] = mergedGoString;
  }

  return mergedGoString;
};

/**  (行, 列) の 1-based インデックスから 0〜80 の Grid 数値を生成する */
export const makeGrid = (
  row: number,
  col: number,
  boardSize: BoardSize,
): Grid => {
  const safeRow = Math.max(1, row);
  const safeCol = Math.max(1, col);
  return (safeRow - 1) * boardSize + (safeCol - 1);
};

/**  手番交代（black ↔ white） */
export const getOppositeColor = (color: Color): Color =>
  color === BLACK ? WHITE : BLACK;

/**  空の盤面（オブジェクト）を作成する */
export const initBoard = (boardSize: BoardSize): Board =>
  new Array(boardSize * boardSize).fill(null);

/**  Boardをディープコピーする（参照関係を維持） */
export const cloneBoard = (board: Board): Board => {
  const newBoard: Board = new Array(board.length);
  const goStringMap = new Map<GoString, GoString>();

  for (let i = 0; i < board.length; i++) {
    const goString = board[i];
    if (goString === null) {
      newBoard[i] = null;
      continue;
    }

    if (!goStringMap.has(goString)) {
      goStringMap.set(goString, {
        color: goString.color,
        stones: new Set(goString.stones),
        liberties: new Set(goString.liberties),
      });
    }

    newBoard[i] = goStringMap.get(goString)!;
  }

  return newBoard;
};

/**  合法手判定 */
export const isLegalMove = (
  boardSize: BoardSize,
  grid: Grid,
  board: Board,
  lastMove: Grid | null,
  currentColor: Color,
  lastBoard: Board,
): boolean => {
  // パスならOK
  if (grid === PASS_GRID) {
    return true;
  }

  if (!isEmptyGrid(grid, board)) {
    return false;
  }

  if (isSelfCapture(boardSize, grid, board, currentColor)) {
    return false;
  }

  if (
    lastMove !== null &&
    lastMove !== PASS_GRID &&
    isKoViolation(boardSize, currentColor, grid, lastMove, board, lastBoard)
  ) {
    return false;
  }

  return true;
};

/**  着手処理（安全のためにクローンした盤面を操作して返す） */
export const applyMove = (
  boardSize: BoardSize,
  grid: Grid,
  board: Board,
  currentColor: Color,
): { board: Board; agehama: number } => {
  const nextBoard = cloneBoard(board);

  if (grid === PASS_GRID) {
    return { board: nextBoard, agehama: 0 };
  }

  const adjacentMyStringSet = new Set<GoString>();
  const adjacentOppStringSet = new Set<GoString>();
  const initialLiberties: Grid[] = [];

  for (const neighbor of getNeighbors(grid, boardSize)) {
    const neighborString = nextBoard[neighbor];

    if (!neighborString) {
      initialLiberties.push(neighbor);
    } else if (neighborString.color === currentColor) {
      adjacentMyStringSet.add(neighborString);
    } else {
      adjacentOppStringSet.add(neighborString);
    }
  }

  let selfString: GoString = {
    color: currentColor,
    stones: new Set([grid]),
    liberties: new Set(initialLiberties),
  };

  nextBoard[grid] = selfString;

  for (const adjacentMyString of adjacentMyStringSet) {
    selfString = mergeGoStrings(grid, selfString, adjacentMyString, nextBoard);
  }

  let agehama = 0;
  for (const enemy of adjacentOppStringSet) {
    agehama += reduceLiberty(enemy, nextBoard, grid, boardSize);
  }

  return { board: nextBoard, agehama };
};
