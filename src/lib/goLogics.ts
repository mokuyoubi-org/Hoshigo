// // // // // // // // // // // // // // // // // //
//        　　　　  　定　　義　　部　　　              //
// // // // // // // // // // // // // // // // // //

// // // // 座 標 // // // //
type Grid = {
  row: number;
  col: number;
};

// Grid → "row,col" に変換（Board の key 用）
// const stringifyGrid = (grid: Grid): string => `${grid.row},${grid.col}`;
function stringifyGrid(grid: Grid): string {
  if (grid.row === 0 && grid.col === 0) {
    return "p";
  }
  const row = grid.row;
  const col = grid.col;

  const key = `${row},${col}`;
  return key;
}

// "row,col" → Grid に戻す
// const keyToGrid = (key: string): Grid => {
//   const [row, col] = key.split(",").map(Number);
//   return { row, col };
// };

function keyToGrid(key: string): Grid {
  if (key === "p") {
    return { row: 0, col: 0 };
  }
  const parts = key.split(",");
  const row = Number(parts[0]);
  const col = Number(parts[1]);

  return {
    row: row,
    col: col,
  };
}

// 上下左右の隣接点（1 始まりのまま）
const getNeighbors = (grid: Grid): Grid[] => [
  { row: grid.row - 1, col: grid.col },
  { row: grid.row + 1, col: grid.col },
  { row: grid.row, col: grid.col - 1 },
  { row: grid.row, col: grid.col + 1 },
];

const isInsideBoard = (grid: Grid, boardSize: number): boolean =>
  grid.row >= 1 &&
  grid.row <= boardSize &&
  grid.col >= 1 &&
  grid.col <= boardSize;

// // // // 石 // // // //
type Color = "black" | "white";

// 手番交代用
const getOppositeColor = (color: Color): Color =>
  color === "black" ? "white" : "black";

// // // // 連 // // // //
type GoString = {
  color: Color; // 石の色
  stones: Set<string>; // 構成石（"row,col"）
  liberties: Set<string>; // 呼吸点（"row,col"）
};

// // // // 盤 面 // // // //
type Board = Record<string, GoString | null>;

// // // // // // // // // // // // // // // // // //
//        　初　　期　　化　・　コ　　ピ　　ー           //
// // // // // // // // // // // // // // // // // //

// 空の盤を作る
const initializeBoard = (boardSize: number): Board => {
  const board: Board = {};

  for (let row = 1; row <= boardSize; row++) {
    for (let col = 1; col <= boardSize; col++) {
      board[`${row},${col}`] = null;
    }
  }

  return board;
};

// Board をディープコピーする
// 同じ GoString を参照しているマスは
// 新しい Board でも同じ GoString を参照するようにする
const cloneBoard = (board: Board): Board => {
  const newBoard: Board = {};
  const goStringMap = new Map<GoString, GoString>();

  for (const [key, goString] of Object.entries(board)) {
    if (goString === null) {
      newBoard[key] = null;
      continue;
    }

    if (!goStringMap.has(goString)) {
      goStringMap.set(goString, {
        color: goString.color,
        stones: new Set(goString.stones),
        liberties: new Set(goString.liberties),
      });
    }

    newBoard[key] = goStringMap.get(goString)!;
  }

  return newBoard;
};

// // // // // // // // // // // // // // // // // //
//        　　　　 　判　　　定　　　系　　              //
// // // // // // // // // // // // // // // // // //

// 空点かどうか
const isEmptyGrid = (grid: Grid, board: Board): boolean =>
  board[stringifyGrid(grid)] === null;

// コウ判定
// 1. 上下左右が全て相手の色の連もしくは盤外
// 2. 構成石1, 呼吸点1の石が一つだけあって、
// 3. それがlastMoveと一致しているならコウで着手禁止
const isKoViolation = (
  boardSize: number,
  grid: Grid,
  board: Board,
  lastMove: Grid,
  currentColor: Color,
  lastBoard: Board,
): boolean => {
  const opponentStrings = new Set<GoString>();

  for (const neighbor of getNeighbors(grid)) {
    if (!isInsideBoard(neighbor, boardSize)) continue; // 隣接点が盤外

    const neighborString = board[stringifyGrid(neighbor)];
    if (neighborString === null) return false; // 隣接点に空点があればコウではない
    if (neighborString.color === currentColor) return false; // 隣接点に自分と同じ色の連があればコウではない

    opponentStrings.add(neighborString); //
  }

  // console.log(
  //   `ここまできたということは今回打ちたい点の上下左右は全て盤外もしくは相手の色の連`
  // );

  // 構成石1, 呼吸点1の石を探す。
  const oneStoneOneLiberty: GoString[] = [];
  for (const opponentString of opponentStrings) {
    if (
      opponentString.stones.size === 1 &&
      opponentString.liberties.size === 1
    ) {
      oneStoneOneLiberty.push(opponentString);
    }
  }

  const lastStone = [...(oneStoneOneLiberty[0]?.stones ?? [])][0];

  if (
    oneStoneOneLiberty.length === 1 &&
    lastStone === stringifyGrid(lastMove) &&
    lastBoard[stringifyGrid(grid)]?.color === currentColor
  ) {
    // console.log(`stringifyGrid(lastMove): ${stringifyGrid(lastMove)}`);
    return true;
  }
  return false;
};

// 自殺手判定
const isSelfCapture = (
  boardSize: number,
  grid: Grid,
  board: Board,
  currentColor: Color,
): boolean => {
  const friendlyStrings = new Set<GoString>();
  const opponentStrings = new Set<GoString>();

  for (const neighbor of getNeighbors(grid)) {
    if (!isInsideBoard(neighbor, boardSize)) continue;

    const neighborString = board[stringifyGrid(neighbor)];
    if (neighborString === null) return false;

    if (neighborString.color === currentColor) {
      friendlyStrings.add(neighborString);
    } else {
      opponentStrings.add(neighborString);
    }
  }

  for (const opponent of opponentStrings) {
    if (opponent.liberties.size === 1) return false;
  }

  for (const friend of friendlyStrings) {
    if (friend.liberties.size >= 2) return false;
  }

  return true;
};

// 合法手判定
const isLegalMove = (
  boardSize: number,
  grid: Grid,
  board: Board,
  lastMove: Grid | null,
  currentColor: Color,
  lastBoard: Board,
): boolean => {
  // パスにも対応。パスならtrue
  if (grid.row === 0 && grid.col === 0) {
    return true;
  }

  // 1. そのマスが空いているか
  if (!isEmptyGrid(grid, board)) {
    return false;
  }

  // 2. 自殺手になっていないか
  if (isSelfCapture(boardSize, grid, board, currentColor)) {
    return false;
  }

  // 3. 劫（コウ）違反チェック（初手は無視）
  if (
    lastMove !== null &&
    isKoViolation(boardSize, grid, board, lastMove, currentColor, lastBoard)
  ) {
    return false;
  }

  // すべてOKなら合法手
  return true;
};

// // // // // // // // // // // // // // // // // //
//        　　　　　 連　　の　　操　　作　              //
// // // // // // // // // // // // // // // // // //

// Set 合体（読みやすさ優先）
const mergeStringSets = (
  first: Set<string>,
  second: Set<string>,
): Set<string> => new Set([...first, ...second]);

// 連を盤から取り除く
const removeGoString = (
  goString: GoString,
  board: Board,
  boardSize: number,
) => {
  for (const stoneKey of goString.stones) {
    const stoneGrid = keyToGrid(stoneKey);

    for (const neighbor of getNeighbors(stoneGrid)) {
      if (!isInsideBoard(neighbor, boardSize)) continue;

      const neighborString = board[stringifyGrid(neighbor)];
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
  boardSize: number,
) => {
  goString.liberties.delete(stringifyGrid(playedGrid));

  if (goString.liberties.size === 0) {
    let agehamaCount = goString.stones.size;
    removeGoString(goString, board, boardSize);
    console.log("agehamaCount: ", agehamaCount);
    return agehamaCount;
  }
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

  mergedLiberties.delete(stringifyGrid(playedGrid));

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

// // // // // // // // // // // // // // // // // //
//        　　　　 着　　手　　処　　理　　　            //
// // // // // // // // // // // // // // // // // //

// とにかく、手を適用するだけ。
const applyMove = (
  boardSize: number,
  grid: Grid,
  board: Board,
  currentColor: Color,
): { board: Board; agehama: number } => {
  // パスなら何もせず返すだけ
  if (grid.row === 0 && grid.col === 0) {
    return { board: board, agehama: 0 };
  }

  const adjacentFriendlyStrings = new Set<GoString>();
  const adjacentOpponentStrings = new Set<GoString>();
  const initialLiberties: string[] = [];

  for (const neighbor of getNeighbors(grid)) {
    if (!isInsideBoard(neighbor, boardSize)) continue;

    const neighborString = board[stringifyGrid(neighbor)];

    if (neighborString === null) {
      initialLiberties.push(stringifyGrid(neighbor));
    } else if (neighborString.color === currentColor) {
      adjacentFriendlyStrings.add(neighborString);
    } else {
      adjacentOpponentStrings.add(neighborString);
    }
  }

  // 自分自身の連を作る
  let selfString: GoString = {
    color: currentColor,
    stones: new Set([stringifyGrid(grid)]),
    liberties: new Set(initialLiberties),
  };

  board[stringifyGrid(grid)] = selfString;

  // 味方と合体
  for (const friend of adjacentFriendlyStrings) {
    selfString = mergeGoStrings(grid, selfString, friend, board);
  }

  // 相手の呼吸点を減らす
  // 連を食べてしまった場合、その数を記録しておき、returnする
  let agehama = 0;
  for (const enemy of adjacentOpponentStrings) {
    agehama += reduceLiberty(enemy, board, grid, boardSize) || 0;
  }

  return { board: board, agehama: agehama };
};

// // // // // // // // // // // // // // // // // //
//        　　エ　　ク　　ス　　ポ　　ー　　ト           //
// // // // // // // // // // // // // // // // // //

export {
  applyMove,
  Board,
  cloneBoard,
  Color,
  getNeighbors,
  getOppositeColor,
  GoString,
  Grid,
  initializeBoard,
  isEmptyGrid,
  isInsideBoard,
  isKoViolation,
  isLegalMove,
  isSelfCapture,
  keyToGrid,
  mergeGoStrings,
  mergeStringSets,
  reduceLiberty,
  removeGoString,
  stringifyGrid,
};
