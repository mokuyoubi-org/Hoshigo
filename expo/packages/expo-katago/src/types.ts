export type Grid = number;
export type Color = typeof EMPTY | typeof BLACK | typeof WHITE;
export type GoString = {
  color: Color;
  stones: Set<Grid>;
  liberties: Set<Grid>;
};
export type Board = (GoString | null)[];
export type MoveObject = { x: number; y: number; player: Color };
export type Agehama = { black: number; white: number };
export type BoardSize = 9 | 13 | 19;
export type MatchType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 定数
export const PASS_GRID: Grid = -1;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const KOMI = 6.5;

export type FloatArray = Float32Array | number[];