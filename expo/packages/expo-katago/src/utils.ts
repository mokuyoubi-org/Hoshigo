import {
  BLACK,
  Board,
  BoardSize,
  Color,
  EMPTY,
  GoString,
  Grid,
  MatchType,
  MoveObject,
  PASS_GRID,
  WHITE,
} from "./types";

export type Board2D = Color[][];

const initBoard2D = (boardSize: BoardSize): Board2D => {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
};

// Board ▶︎ 2次元配列 (board2D)
export const boardToBoard2D = (board: Board, boardSize: BoardSize): Board2D => {
  const stones: Board2D = initBoard2D(boardSize);

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const grid: Grid = r * boardSize + c;
      const goString = board[grid];

      if (goString?.color === BLACK) {
        stones[r][c] = BLACK;
      } else if (goString?.color === WHITE) {
        stones[r][c] = WHITE;
      } else {
        stones[r][c] = EMPTY;
      }
    }
  }
  return stones;
};

// Grid[] ▶︎ MoveObject[]
export const movesToMoveObjects = (
  moves: Grid[],
  boardSize: BoardSize,
  matchType: MatchType,
): MoveObject[] => {
  const moveObjects: MoveObject[] = generateMoveObjects(boardSize, matchType);
  let playerColor: Color = isNoOkiishi(matchType) ? BLACK : WHITE;

  for (const move of moves) {
    if (move === PASS_GRID) {
      moveObjects.push({ x: -1, y: -1, player: playerColor });
    } else {
      const x = (move % boardSize) + 1;
      const y = Math.floor(move / boardSize) + 1;
      moveObjects.push({ x, y, player: playerColor });
    }
    playerColor = getOppositeColor(playerColor);
  }
  return moveObjects;
};

export const isNoOkiishi = (matchType: MatchType): boolean =>
  matchType === 0 || matchType === 1;

// 置き碁用 MoveObject[] の生成
export const generateMoveObjects = (
  boardSize: BoardSize,
  matchType: MatchType,
): MoveObject[] => {
  if (isNoOkiishi(matchType)) return [];

  const passWhite: MoveObject = { x: -1, y: -1, player: WHITE };

  const okigoBoard = generateOkigoBoard(matchType, boardSize);
  const result: MoveObject[] = [];

  for (const [keyStr, goString] of Object.entries(okigoBoard)) {
    if (goString?.color === BLACK) {
      if (result.length > 0) result.push(passWhite);
      result.push(gridToMoveObject(Number(keyStr), boardSize));
    }
  }
  return result;
};

const gridToMoveObject = (grid: Grid, boardSize: BoardSize): MoveObject => ({
  x: (grid % boardSize) + 1,
  y: Math.floor(grid / boardSize) + 1,
  player: BLACK,
});

// 置き碁用Board生成（1次元Grid対応）
export const generateOkigoBoard = (
  matchType: MatchType,
  boardSize: BoardSize,
): Board => {
  let board = initBoard(boardSize);
  const m = (r: number, c: number) => makeGrid(r, c, boardSize);

  if (boardSize === 9) {
    const okiishiGrids: Record<MatchType, Grid[]> = {
      0: [],
      1: [],
      2: [m(3, 7), m(7, 3)],
      3: [m(3, 7), m(7, 3), m(7, 7)],
      4: [m(3, 3), m(7, 7), m(7, 3), m(3, 7)],
      5: [m(3, 3), m(7, 7), m(7, 3), m(3, 7), m(5, 5)],
      6: [],
      7: [],
      8: [],
      9: [],
    };
    for (const grid of okiishiGrids[matchType] ?? []) {
      board = applyMove(boardSize, grid, board, BLACK).board;
    }
  } else if (boardSize === 13) {
    const okiishiGrids: Record<MatchType, Grid[]> = {
      0: [],
      1: [],
      2: [m(4, 10), m(10, 4)],
      3: [m(4, 10), m(10, 4), m(10, 10)],
      4: [m(4, 4), m(10, 10), m(10, 4), m(4, 10)],
      5: [m(4, 4), m(10, 10), m(10, 4), m(4, 10), m(7, 7)],
      6: [m(4, 4), m(10, 10), m(10, 4), m(4, 10), m(7, 4), m(7, 10)],
      7: [m(4, 4), m(10, 10), m(10, 4), m(4, 10), m(7, 7), m(7, 4), m(7, 10)],
      8: [
        m(4, 4),
        m(10, 10),
        m(10, 4),
        m(4, 10),
        m(7, 4),
        m(7, 10),
        m(10, 7),
        m(4, 7),
      ],
      9: [
        m(4, 4),
        m(10, 10),
        m(10, 4),
        m(4, 10),
        m(7, 7),
        m(7, 4),
        m(7, 10),
        m(10, 7),
        m(4, 7),
      ],
    };
    for (const grid of okiishiGrids[matchType] ?? []) {
      board = applyMove(boardSize, grid, board, BLACK).board;
    }
  } else if (boardSize === 19) {
    const okiishiGrids: Record<MatchType, Grid[]> = {
      0: [],
      1: [],
      2: [m(4, 16), m(16, 4)],
      3: [m(4, 16), m(16, 4), m(16, 16)],
      4: [m(4, 4), m(16, 16), m(16, 4), m(4, 16)],
      5: [m(4, 4), m(16, 16), m(16, 4), m(4, 16), m(10, 10)],
      6: [m(4, 4), m(16, 16), m(16, 4), m(4, 16), m(10, 4), m(10, 16)],
      7: [
        m(4, 4),
        m(16, 16),
        m(16, 4),
        m(4, 16),
        m(10, 10),
        m(10, 4),
        m(10, 16),
      ],
      8: [
        m(4, 4),
        m(16, 16),
        m(16, 4),
        m(4, 16),
        m(10, 4),
        m(10, 16),
        m(16, 10),
        m(4, 10),
      ],
      9: [
        m(4, 4),
        m(16, 16),
        m(16, 4),
        m(4, 16),
        m(10, 10),
        m(10, 4),
        m(10, 16),
        m(16, 10),
        m(4, 10),
      ],
    };
    for (const grid of okiishiGrids[matchType] ?? []) {
      board = applyMove(boardSize, grid, board, BLACK).board;
    }
  }
  return board;
};

// 🟩上下左右の隣接点インデックスを取得する
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

// 🟩Set合体ヘルパー
const mergeStringSets = (first: Set<Grid>, second: Set<Grid>): Set<Grid> =>
  new Set([...first, ...second]);

// 🟩連を盤から取り除く
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

// 🟩呼吸点を減らす
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

// 🟩連を合体する
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

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

/** 🟩🟦 (行, 列) の 1-based インデックスから 0〜80 の Grid 数値を生成する */
const makeGrid = (row: number, col: number, boardSize: BoardSize): Grid => {
  const safeRow = Math.max(1, row);
  const safeCol = Math.max(1, col);
  return (safeRow - 1) * boardSize + (safeCol - 1);
};

/** 🟩🟦 手番交代（black ↔ white） */
export const getOppositeColor = (color: Color): Color =>
  color === BLACK ? WHITE : BLACK;

/** 🟩🟦 空の盤面（オブジェクト）を作成する */
const initBoard = (boardSize: BoardSize): Board =>
  new Array(boardSize * boardSize).fill(null);

/** 🟩🟦 Boardをディープコピーする（参照関係を維持） */
const cloneBoard = (board: Board): Board => {
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

/** 🟩🟦 着手処理（安全のためにクローンした盤面を操作して返す） */
const applyMove = (
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
