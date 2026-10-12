// types/go.ts

// 型
export type Grid = number;
export type Color = typeof EMPTY | typeof BLACK | typeof WHITE;
export type GoString = {
  color: Color;
  stones: Set<Grid>;
  liberties: Set<Grid>;
};
export type Board = (GoString | null)[];
export type MoveObject = { x: number; y: number; player: Color };
export type AgehamaCount = { black: number; white: number };
export type BoardSize = 5 | 9 | 13 | 19;
export type MatchType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 13 |16| 25;

// 定数
export const PASS_GRID: Grid = -1;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const KOMI = 6.5;

// 置き石(2〜9子局)が無いかどうかの判定
export const isNoOkiishi = (matchType: MatchType): boolean =>
  matchType === 0 || matchType === 1;

export type Board2D = Color[][];
