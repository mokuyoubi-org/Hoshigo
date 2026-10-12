import { BoardSize, Grid, PASS_GRID, RecordAnalysis } from "go-core";

/**
 * URLで受け取った手を、きれいな Grid[] にそろえる。
 * - 配列 / "1,2,3" / "[1,2,3]" のどの形で来ても読める
 * - 数字として読めない手、盤の外の手が出てきたら、その手の手前までを使う
 *   (壊れた手をKataGoに渡さないため)
 */
export const parseMovesParam = (
  raw: string | string[] | undefined,
  boardSize: BoardSize,
): Grid[] => {
  if (!raw) return [];

  const tokens = (Array.isArray(raw) ? raw : [raw])
    .flatMap((s) => s.replace(/[\[\]\s]/g, "").split(","))
    .filter((s) => s !== "");

  const nums = tokens.map(Number);

  const isValid = (n: number) =>
    Number.isInteger(n) &&
    (n === PASS_GRID || (n >= 0 && n < boardSize * boardSize));

  const firstBad = nums.findIndex((n) => !isValid(n));
  if (firstBad !== -1) {
    console.warn(
      `[parseMovesParam] ${firstBad}手目が不正なので、その手前までを使います`,
      tokens[firstBad],
    );
    return nums.slice(0, firstBad) as Grid[];
  }
  return nums as Grid[];
};

/**
 * URLで受け取った分析結果(JSON文字列)を RecordAnalysis に戻す。
 * 再開する局面(movesLength手打った後)の分析までだけを使う。
 * 読めない時は undefined(=分析なしで始める。対局は普通にできる)。
 */
export const parseAnalysisParam = (
  raw: string | undefined,
  movesLength: number,
): RecordAnalysis | undefined => {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as RecordAnalysis;
    if (!Array.isArray(parsed?.perMove)) return undefined;
    return { perMove: parsed.perMove.slice(0, movesLength + 1) };
  } catch (e) {
    console.warn("[parseAnalysisParam] 分析結果が読めませんでした", e);
    return undefined;
  }
};