// expo/packages/go-core/src/logics/endgameLogics.ts
//
// 「終局しているか？」を見分ける道具。

import { Ownership } from "../types/analysis";
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
import { ownershipToDeadStones } from "./ownershipLogics";

// これは何を防ぐか？置石などだと、最初から全ての陣地が黒扱いされていることがある。それが無くなるまでの猶予期間。
// なのでとても大切。
// 9路盤での5子局、13路盤での9子局、19路盤での25子局など、かなり早期に終局しそうな状況であっても、それでも流石にこの手数以下で終局することは
// まずありえないだろ、という手数。
const MIN_MOVES_FOR_TERRITORY_CHECK: Record<BoardSize, number> = {
  5: 10, // 互先でも定先でも初っ端から全部黒。それが無くなるまでの猶予
  9: 20, // 4,5子局では初っ端から全部黒。それが無くなるまでの猶予
  13: 30, // 9子局では初っ端から全部黒。それが無くなるまでの猶予
  19: 40, // 25子局でも全部黒ではないが、一応猶予を持たせる
};

// 「直近2手が連続パス(=終局)か？」を判定する唯一の場所。
export const endsWithDoublePass = (moves: Grid[]): boolean => {
  const len = moves.length;
  return (
    len >= 2 && moves[len - 1] === PASS_GRID && moves[len - 2] === PASS_GRID
  );
};

// 4方向の隣接インデックスを取得
const getOrthogonalNeighbors = (grid: Grid, boardSize: BoardSize): Grid[] => {
  const row = Math.floor(grid / boardSize);
  const col = grid % boardSize;
  const neighbors: Grid[] = [];
  if (row > 0) neighbors.push(grid - boardSize);
  if (row < boardSize - 1) neighbors.push(grid + boardSize);
  if (col > 0) neighbors.push(grid - 1);
  if (col < boardSize - 1) neighbors.push(grid + 1);
  return neighbors;
};

// 空点を4方向連結でグループ化する
const getEmptyRegions = (board: Board, boardSize: BoardSize): Grid[][] => {
  const size = boardSize * boardSize;
  const visited = new Array(size).fill(false);
  const regions: Grid[][] = [];

  for (let i = 0; i < size; i++) {
    if (board[i] !== null || visited[i]) continue;

    const region: Grid[] = [];
    const stack: Grid[] = [i];
    visited[i] = true;

    while (stack.length > 0) {
      const current = stack.pop()!;
      region.push(current);
      for (const n of getOrthogonalNeighbors(current, boardSize)) {
        if (board[n] === null && !visited[n]) {
          visited[n] = true;
          stack.push(n);
        }
      }
    }
    regions.push(region);
  }

  return regions;
};

// 終局しているかどうかの判定ロジック。次のどれかに当てはまれば「未終局」。
//  1. 手数が短すぎる
//  2. 生きている黒の連と白の連が隣り合っていて、どちらかの呼吸点が1
//     (境界の石が取られかねないので、手入れが必要)
//  3. 1つの空間の中に、"B" "W" "." のうち2種類以上が混ざっている
//     (地の境界が閉じていない。ダメ・セキは "." だけの空間なので対象外)
//  4. "B" だけ / "W" だけの空間のまわりに、生きている敵の石がいる(死に石は除く)
export const isBoardUnfinished = (
  board: Board,
  boardSize: BoardSize,
  ownership: Ownership,
  moveCount: number,
): boolean => {
  if (moveCount < MIN_MOVES_FOR_TERRITORY_CHECK[boardSize]) {
    return true; // 問答無用で「まだ早い」
  }

  // 死に石は、後続の判定から除外するために先に計算しておく
  const deadStones = new Set(ownershipToDeadStones(board, ownership));

  // 連が死んでいるか(代表の石1個で判定。連の中の石は同じ死活という前提)
  const isDeadString = (goString: GoString): boolean => {
    const representativeStone = goString.stones.values().next().value;
    return (
      representativeStone !== undefined && deadStones.has(representativeStone)
    );
  };

  // ② 生きた黒と白が隣り合っていて、どちらかの呼吸点が1なら未終局
  for (let grid = 0; grid < boardSize * boardSize; grid++) {
    const myString = board[grid];
    if (myString === null) continue;

    for (const neighbor of getOrthogonalNeighbors(grid, boardSize)) {
      const otherString = board[neighbor];
      if (otherString === null || otherString.color === myString.color) {
        continue;
      }
      if (isDeadString(myString) || isDeadString(otherString)) continue;

      if (myString.liberties.size === 1 || otherString.liberties.size === 1) {
        return true; // 境界の石が取られかねない → 手入れが必要
      }
    }
  }

  for (const region of getEmptyRegions(board, boardSize)) {
    // 孤立1点(ダメ・セキの共有点)は判定対象外
    if (region.length < 2) continue;

    // ③ 空間の中身が、全部同じ文字("B"だけ / "W"だけ / "."だけ)か
    const firstChar = ownership[region[0]];
    if (region.some((grid) => ownership[grid] !== firstChar)) {
      return true; // 混ざっている → 境界が閉じていない
    }

    // "." だけの空間は、ダメやセキなので問題なし
    if (firstChar === ".") continue;

    const regionColor: Color = firstChar === "B" ? BLACK : WHITE;

    // ④ この空間を取り囲む石の中に、生きている「自分の色ではない石」がいないか
    const borderingStrings = new Set<GoString>();
    for (const grid of region) {
      for (const neighbor of getOrthogonalNeighbors(grid, boardSize)) {
        const goString = board[neighbor];
        if (goString !== null) borderingStrings.add(goString);
      }
    }

    for (const goString of borderingStrings) {
      if (goString.color === regionColor) continue; // 自分の色の石なら問題なし

      if (!isDeadString(goString)) {
        return true; // 生きている敵石が地に接している → 未終局
      }
    }
  }

  return false;
};
