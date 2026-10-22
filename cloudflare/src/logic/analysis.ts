// cloudflare/src/logic/analysis.ts
//
// アプリが出してきた「1局ぶんの分析」が、正しい形か確認する。
// (変なデータが R2 に入らないように)
// 全部の局面がそろっていないものは、受け付けない(R2にあれば、必ず完全体)。

const MAX_CANDIDATES = 10; // 1局面あたりの候補手の上限
const PASS_GRID = -1;
const BOARD_CELLS: Record<number, number> = { 9: 81, 13: 169, 19: 361 };

// ownershipの文字列として許す文字(長さは盤面の点数と一致するか、別で確認する)
const OWNERSHIP_PATTERN = /^[BW.]+$/;

// 最終局面の地(ownership)の文字列が、正しい形か確認する。
// 盤面の点数と同じ長さで、B / W / . だけでできていること。
export const isValidOwnership = (
  value: unknown,
  boardSize: number,
): value is string => {
  const cells = BOARD_CELLS[boardSize];
  return (
    !!cells &&
    typeof value === "string" &&
    value.length === cells &&
    OWNERSHIP_PATTERN.test(value)
  );
};

// 整数で、範囲の中に入っているか
function isIntInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= min &&
    (value as number) <= max
  );
}

// 候補手の配列(gridの数字だけ)が正しいか確認
const isValidCandidates = (value: unknown, cells: number): value is number[] =>
  Array.isArray(value) &&
  value.length <= MAX_CANDIDATES &&
  value.every((grid) => grid === PASS_GRID || isIntInRange(grid, 0, cells - 1));

// R2に書く、分析の形(項目ごとの配列。位置 = 局面の番号)
export type SubmittedAnalysis = {
  ownership: string[];
  win_rate: number[];
  candidates: number[][];
};

// 受け取った分析を確認して、R2に書ける形にして返す。
// positions = 局面の数(手数 + 1)。1つでも欠けていたり、変だったりしたら null。
export function parseAnalysis(
  value: unknown,
  boardSize: number,
  positions: number,
): SubmittedAnalysis | null {
  const cells = BOARD_CELLS[boardSize];
  if (!cells || typeof value !== "object" || value === null) return null;

  const { ownership, win_rate, candidates } = value as Record<string, unknown>;
  if (
    !Array.isArray(ownership) ||
    ownership.length !== positions ||
    !Array.isArray(win_rate) ||
    win_rate.length !== positions ||
    !Array.isArray(candidates) ||
    candidates.length !== positions
  ) {
    return null;
  }

  const result: SubmittedAnalysis = {
    ownership: [],
    win_rate: [],
    candidates: [],
  };
  for (let i = 0; i < positions; i++) {
    const own = ownership[i];
    const win = win_rate[i];
    const list = candidates[i] ?? [];
    if (
      typeof own !== "string" ||
      own.length !== cells ||
      !OWNERSHIP_PATTERN.test(own) ||
      !isIntInRange(win, 0, 100) ||
      !isValidCandidates(list, cells)
    ) {
      return null;
    }
    result.ownership.push(own);
    result.win_rate.push(win);
    result.candidates.push(list);
  }
  return result;
}