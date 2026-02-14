// プロフィール登録関連
export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password: string) => {
  return password.length >= 6;
};

/**
 * "B+2.5", "W+R", "B+T", "D"
 * を 2byte int に変換
 */
export function encodeResult(result: string): number {
  // --- 勝者 ---
  let winnerBits = 0;
  if (result.startsWith("W")) winnerBits = 0b01;
  else if (result.startsWith("D")) winnerBits = 0b10;
  // 引き分け
  if (winnerBits === 0b10) {
    return winnerBits << 14;
  }
  const body = result.slice(2); // "2.5", "R", "T", "C"
  // --- 勝ち方 ---
  let typeBits = 0;
  let valueBits = 0;
  if (body === "R") typeBits = 0b001;
  else if (body === "T") typeBits = 0b010;
  else if (body === "C") typeBits = 0b011;
  else {
    typeBits = 0b000;
    valueBits = Math.round(parseFloat(body) * 2);
  }
  return (winnerBits << 14) | (typeBits << 11) | valueBits;
}

/**
 * 2byte int を "B+2.5" などに戻す
 */
export function decodeResult(encoded: number): string {
  const winnerBits = (encoded >> 14) & 0b11;
  const typeBits = (encoded >> 11) & 0b111;
  const valueBits = encoded & 0b11111111111;

  // 勝者
  let winner = "B";
  if (winnerBits === 0b01) winner = "W";
  if (winnerBits === 0b10) return "D";

  // 勝ち方
  if (typeBits === 0b001) return `${winner}+R`;
  if (typeBits === 0b010) return `${winner}+T`;
  if (typeBits === 0b011) return `${winner}+C`;

  // 点勝ち
  return `${winner}+${(valueBits / 2).toFixed(1)}`;
}

/**
 * 座標文字列を数値インデックスに変換
 * パス("p")は -1 として扱う
 */
function moveStringToNumber(move: string, boardSize: number = 9): number {
  if (move === "p") return -1; // パス

  const [row, col] = move.split(",").map(Number);
  return (row - 1) * boardSize + (col - 1);
}

/**
 * 数値インデックスを座標文字列に変換
 * -1 はパス("p")として扱う
 */
function moveNumberToString(index: number, boardSize: number = 9): string {
  if (index === -1) return "p"; // パス

  const row = Math.floor(index / boardSize) + 1;
  const col = (index % boardSize) + 1;
  return `${row},${col}`;
}

/**
 * 座標文字列の配列を数値インデックスの配列に変換
 * @example moveStringsToNumbers(["1,1", "p", "9,9"], 9) // => [0, -1, 80]
 */
export function moveStringsToNumbers(
  moves: string[],
  boardSize: number = 9,
): number[] {
  if (!moves) return []; // ← 猫の安全ネット♪

  return moves.map((move) => moveStringToNumber(move, boardSize));
}

/**
 * 数値インデックスの配列を座標文字列の配列に変換
 * @example moveNumbersToStrings([0, -1, 80], 9) // => ["1,1", "p", "9,9"]
 */
export function moveNumbersToStrings(
  indices: number[],
  boardSize: number = 9,
): string[] {
  if (!indices) return []; // ← 猫の安全ネット♪

  return indices.map((index) => moveNumberToString(index, boardSize));
}



const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));