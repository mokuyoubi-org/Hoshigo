// moveConverters.ts

import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  isNoOkiishi,
  MatchType,
  MoveObject,
  PASS_GRID,
  WHITE,
} from "../types/go";
import { boardToBoard2D } from "./boardConverters";
import { getOppositeColor } from "./goLogics";
import { generateOkigoBoard } from "./okigoLogics";

// go-coreの Color(数字) → expo-katagoの手番(文字列)
export const colorToPlayer = (c: Color): "black" | "white" =>
  c === BLACK ? "black" : "white";

// 1始まり(go-core) ⇄ 0始まり(expo-katago)。パス(-1)はそのまま
const toZeroBased = (n: number) => (n === -1 ? -1 : n - 1);
export const toOneBased = (n: number) => (n === -1 ? -1 : n + 1);

// go-coreの盤面(Board) → expo-katagoの盤面(文字列/nullの二次元配列)
export const toBoardState = (
  board: Board,
  boardSize: BoardSize,
): ("black" | "white" | null)[][] =>
  boardToBoard2D(board, boardSize).map((row) =>
    row.map((cell) => {
      if (cell === BLACK) return "black";
      if (cell === WHITE) return "white";
      return null;
    }),
  );

// Grid[] ▶︎ MoveObject[]
export const movesToMoveObjects = (
  moves: Grid[],
  boardSize: BoardSize,
  matchType: MatchType,
) => {
  const baseObjects = generateMoveObjects(boardSize, matchType);
  let playerColor: Color = isNoOkiishi(matchType) ? BLACK : WHITE;

  const moveObjects = baseObjects.map((m) => ({
    x: toZeroBased(m.x),
    y: toZeroBased(m.y),
    player: colorToPlayer(m.player),
  }));

  for (const move of moves) {
    if (move === PASS_GRID) {
      moveObjects.push({
        x: toZeroBased(-1),
        y: toZeroBased(-1),
        player: colorToPlayer(playerColor),
      });
    } else {
      const x = toZeroBased((move % boardSize) + 1);
      const y = toZeroBased(Math.floor(move / boardSize) + 1);
      moveObjects.push({
        x,
        y,
        player: colorToPlayer(playerColor),
      });
    }
    playerColor = getOppositeColor(playerColor);
  }

  return moveObjects;
};
// 2026/09/19修正
// 大事!!!!!!!!!⚠️⚠️⚠️⚠️⚠️⚠️⚠️useKataGoで使われている。
// 置き碁用 MoveObject[] の生成
const generateMoveObjects = (
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
      // 修正：currentPlayer ではなく BLACK を直接渡す⚠️⚠️⚠️⚠️⚠️⚠️ここが大事
      result.push(gridToMoveObject(Number(keyStr), boardSize, BLACK));
    }
  }
  return result;
};

// Grid ▶︎ MoveObject
const gridToMoveObject = (
  grid: Grid,
  boardSize: BoardSize,
  currentPlayer: Color,
): MoveObject => {
  if (grid === PASS_GRID) {
    return {
      x: -1,
      y: -1,
      player: currentPlayer,
    };
  }

  // マスの番号から、横の場所（x）と縦の場所（y）を計算する
  const x = (grid % boardSize) + 1;
  const y = Math.floor(grid / boardSize) + 1;

  // 計算した結果をまとめて返す
  return {
    x: x,
    y: y,
    player: currentPlayer,
  };
};
