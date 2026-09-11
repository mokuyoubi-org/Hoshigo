// packages/expo-goband/src/services/goscorer.d.ts

import { Color } from "../types/go";

export interface LocScore {
  isTerritoryFor: Color | 0;
  [key: string]: any;
}

export interface FinalScore {
  black: number;
  white: number;
  [key: string]: any;
}

export function territoryScoring(
  board: Color[][],
  markedDead: boolean[][],
): LocScore[][];

export function finalTerritoryScore(
  board: Color[][],
  markedDead: boolean[][],
  blackCaptures: number,
  whiteCaptures: number,
  komi: number,
): FinalScore;
