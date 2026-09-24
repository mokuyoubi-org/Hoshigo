// territoryLogics.ts

import {
  finalTerritoryScore,
  LocScore,
  territoryScoring,
} from "../goscorer/goscorer";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  GoString,
  Grid,
  KOMI,
  MatchType,
  WHITE,
} from "../types/go";
import { boardToBoard2D } from "./boardConverters";
import { ownershipToDeadStones } from "./moveConverters";

const BLACK_TERRITORY = 1;
const WHITE_TERRITORY = 2;
const DEAD_STONE = 3;
type TerritoryType =
  | 0
  | typeof BLACK_TERRITORY
  | typeof WHITE_TERRITORY
  | typeof DEAD_STONE;
export type TerritoryBoard = TerritoryType[][];

const initTerritoryBoard = (boardSize: BoardSize): TerritoryBoard => {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
};

// 地計算ボードの生成
export const generateTerritoryBoard = (
  boardSize: BoardSize,
  board: Board,
  deadStones: Grid[],
  matchType: MatchType,
  blackAgehama: number,
  whiteAgehama: number,
): { territoryBoard: TerritoryBoard; result: string } => {
  const komi = matchType === 0 ? KOMI : 0; // matchtype0つまり互先なら
  const stones: Color[][] = boardToBoard2D(board, boardSize);
  const markedDead: boolean[][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => false),
  );
  const territoryBoard: TerritoryBoard = initTerritoryBoard(boardSize);

  for (const grid of deadStones) {
    const row = Math.floor(grid / boardSize);
    const col = grid % boardSize;
    territoryBoard[row][col] = DEAD_STONE;
    markedDead[row][col] = true;
  }

  const finalScore = finalTerritoryScore(
    stones,
    markedDead,
    blackAgehama,
    whiteAgehama,
    komi,
  );
  const scoring: LocScore[][] = territoryScoring(stones, markedDead);

  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (territoryBoard[i][j] === DEAD_STONE) continue;
      if (scoring[i][j].isTerritoryFor === BLACK) {
        territoryBoard[i][j] = BLACK_TERRITORY;
      } else if (scoring[i][j].isTerritoryFor === WHITE) {
        territoryBoard[i][j] = WHITE_TERRITORY;
      }
    }
  }

  if (finalScore.black === finalScore.white) {
    return { territoryBoard, result: `DRAW` };
  } else if (finalScore.black > finalScore.white) {
    return {
      territoryBoard,
      result: `B+${finalScore.black - finalScore.white}`,
    };
  } else {
    return {
      territoryBoard,
      result: `W+${finalScore.white - finalScore.black}`,
    };
  }
};

// 2026/09/18追加: 終局しているかどうかの判定ロジック。
/* 
1. もし、ある繋がった空間内に、ownershipが0.5以上の点も-0.5以下の点も存在していたら、
それはどこかで二つの空間が隙間で繋がってしまっているということなので、終局していない

2. 手数が短すぎる場合、終局していない

3. ある色の空間が、自分の色の石のみで囲まれていない場合、終局していない（ただし死に石は除く）
*/

// 「同じ空間内で黒寄り・白寄りが同居」を判定するための閾値
const UNFINISHED_CONTRADICTION_THRESHOLD = 0.5;
// 「確定地」とみなすための、空間内平均ownershipの絶対値の下限
// これ未満(0に近い)の空間は、ダメやセキの可能性があるので判定をスキップする
const TERRITORY_CONFIDENCE_THRESHOLD = 0.5;

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

// 経験則：これ未満の手数では、9路盤ではまだ地の境界が固まりようがない
const MIN_MOVES_FOR_TERRITORY_CHECK: Record<BoardSize, number> = {
  5: 6,
  9: 12,
  13: 20,
  19: 30,
};

// 連結した同一空間の中に黒地寄り・白地寄りの点が両方存在するなら、
// 陣地の境界が未確定 = 未終局とみなす
export const isBoardUnfinished = (
  board: Board,
  boardSize: BoardSize,
  ownership: ArrayLike<number>,
  movesSoFar: number,
): boolean => {
  if (movesSoFar < MIN_MOVES_FOR_TERRITORY_CHECK[boardSize]) {
    return true; // 問答無用で「まだ早い」
  }

  // 死に石は「敵地に接する生きた敵石」の判定から除外するために先に計算しておく
  const deadStones = new Set(ownershipToDeadStones(board, ownership));

  const regions = getEmptyRegions(board, boardSize);

  for (const region of regions) {
    // 孤立1点(ダメ・セキの共有点)は判定対象外
    if (region.length < 2) continue;

    // ① 同じ空間の中に、黒地寄りと白地寄りが同居していないか
    let hasBlackLeaning = false;
    let hasWhiteLeaning = false;
    for (const grid of region) {
      if (ownership[grid] >= UNFINISHED_CONTRADICTION_THRESHOLD) {
        hasBlackLeaning = true;
      }
      if (ownership[grid] <= -UNFINISHED_CONTRADICTION_THRESHOLD) {
        hasWhiteLeaning = true;
      }
    }
    if (hasBlackLeaning && hasWhiteLeaning) return true;

    // ② 空間全体の平均ownershipから、この空間の「所有者」を仮決定する
    //    (平均が0に近い曖昧な空間は、ダメ・セキの可能性があるのでこの先はスキップ)
    const avgOwnership =
      region.reduce((sum, grid) => sum + ownership[grid], 0) / region.length;
    if (Math.abs(avgOwnership) < TERRITORY_CONFIDENCE_THRESHOLD) continue;

    const regionColor: Color = avgOwnership > 0 ? BLACK : WHITE;

    // ③ この空間を取り囲む石の中に、生きている「自分の色ではない石」がいないか
    const borderingStrings = new Set<GoString>();
    for (const grid of region) {
      for (const neighbor of getOrthogonalNeighbors(grid, boardSize)) {
        const goString = board[neighbor];
        if (goString !== null) borderingStrings.add(goString);
      }
    }

    for (const goString of borderingStrings) {
      if (goString.color === regionColor) continue; // 自分の色の石なら問題なし

      const representativeStone = goString.stones.values().next().value;
      const isDead =
        representativeStone !== undefined &&
        deadStones.has(representativeStone);

      if (!isDead) {
        return true; // 生きている敵石が地に接している → 未終局
      }
    }
  }

  return false;
};


// 2026/09/24 追加

// ownershipから地・死に石を判定してTerritoryBoardを生成する
// (goscorerのterritoryScoringのような連結性判定は使わず、
//  石は連単位の平均、空点は各点独立の値で閾値判定する簡易版)
const OWNERSHIP_TERRITORY_THRESHOLD = 0.5;

export const ownershipToTerritoryBoard = (
  boardSize: BoardSize,
  board: Board,
  ownership: ArrayLike<number>,
): TerritoryBoard => {
  const territoryBoard: TerritoryBoard = initTerritoryBoard(boardSize);

  // 🐱 石は「連単位の平均ownership」で死に石かどうかだけ判定する
  //    (ownershipToDeadStonesの閾値・ロジックをそのまま流用)
  const deadStones = ownershipToDeadStones(board, ownership);
  for (const grid of deadStones) {
    const row = Math.floor(grid / boardSize);
    const col = grid % boardSize;
    territoryBoard[row][col] = DEAD_STONE;
  }

  // 🐱 空点は連結性を見ず、各点独立のownership値だけで地かどうかを判定する
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const grid = i * boardSize + j;
      if (board[grid]) continue; // 石がある場所は上ですでに処理済み

      const value = ownership[grid];
      if (value >= OWNERSHIP_TERRITORY_THRESHOLD) {
        territoryBoard[i][j] = BLACK_TERRITORY;
      } else if (value <= -OWNERSHIP_TERRITORY_THRESHOLD) {
        territoryBoard[i][j] = WHITE_TERRITORY;
      }
    }
  }

  return territoryBoard;
};

// scoreLead(黒視点、+なら黒有利)から "B+X" / "W+X" 形式の文字列を生成する
// (終局していない盤面ではgoscorerの結果は信用できないので、
//  KataGoのscoreLeadをそのまま暫定結果として使うためのもの)
export const scoreLeadToResult = (scoreLead: number): string => {
  const rounded = Math.round(Math.abs(scoreLead) * 2) / 2; // 0.5刻みに丸める
  if (rounded === 0) return "DRAW";
  return scoreLead > 0 ? `B+${rounded}` : `W+${rounded}`;
};