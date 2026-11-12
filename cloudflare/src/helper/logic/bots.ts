// bots.ts
// 乱数生成するのでvolatile

// ボットの名前。強さは、ボット自身の userStats のレートで決まる
export const BOT_NAMES = ["bot1", "bot2", "bot3"] as const;

// レートの近いボットほど当たりやすい、くじ引き。
// 点 = 差の合計 − 自分の差(近いほど点が高い)。当たる確率 = 自分の点 ÷ 点の合計
// 全員の差が0など、点の合計が0になるときは、みんな同じ確率にする
export const pickBotByRating = <T extends { rating: number }>(
  bots: T[],
  humanRating: number,
): T => {
  const diffs = bots.map((b) => Math.abs(b.rating - humanRating));
  const total = diffs.reduce((sum, d) => sum + d, 0);
  const scores = diffs.map((d) => total - d);
  const scoreSum = scores.reduce((sum, s) => sum + s, 0);

  if (scoreSum === 0) {
    return bots[Math.floor(Math.random() * bots.length)];
  }

  let r = Math.random() * scoreSum;
  for (let i = 0; i < bots.length; i++) {
    r -= scores[i];
    if (r < 0) return bots[i];
  }
  return bots[bots.length - 1];
};