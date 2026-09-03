// compareVersions.ts

/**
 * "1.2.3" 形式のバージョン文字列を比較する。
 * a < b なら負の数、a === b なら0、a > b なら正の数を返す。
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}