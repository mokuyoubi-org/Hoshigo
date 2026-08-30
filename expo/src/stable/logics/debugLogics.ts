// 切り捨て ＆ 1行でスッキリ表示する関数だにゃ！
export function printCleanLog<T>(title: string, data: T, decimals: number = 2): void {
  // 数字を「切り捨て」で丸める魔法の計算だにゃ！
  const factor = Math.pow(10, decimals); // 小数点2桁なら 100 になるにゃ

  function format(obj: unknown): unknown {
    if (typeof obj === 'number') {
      // Math.trunc で端数をバッサリ切り捨てるにゃ！
      return Math.trunc(obj * factor) / factor;
    } else if (Array.isArray(obj)) {
      return obj.map(format);
    } else if (typeof obj === 'object' && obj !== null) {
      const formattedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        formattedObj[key] = format(value);
      }
      return formattedObj;
    }
    return obj;
  }

  // JSON.stringify のインデント（改行）を消して1行にしたにゃ！
  console.log(title, JSON.stringify(format(data)));
}