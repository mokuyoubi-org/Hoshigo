// cloudflare/src/logic/rating.ts

// ランクの境目(10k〜2k、1k〜8D)。レーティングがこの値以上なら、そのランクに入る。
// 保存値は Elo の2倍(SCALE を参照)。
const RANK_THRESHOLDS = [
  0,
  20,
  60,
  120,
  200,
  300,
  420,
  560,
  720, // 10k ~ 2k
  900,
  1100,
  1300,
  1500,
  1700,
  1900,
  2100,
  2300,
  2500, // 1k ~ 8D
] as const;

// K=10のSCALE=2の場合、勝っても0点しかもらえないようになる差は、1273以上。
// 保存値は Elo の2倍
const SCALE = 2;
// Elo の式の「400」も、2倍にそろえる
const ELO_DIVISOR = 400 * SCALE;
// ふだんの K
const K_NORMAL = 10;
// 0局目の K。1局ごとに K_STEP ずつ下がる
const K_NEWCOMER = 100;
const K_STEP = 3;
// この局数になると、K が K_NORMAL(100 - 3×30 = 10)に戻る
const NEWCOMER_GAMES = 30;

// レーティング → ランクの番号(0 = 10k)
export const ratingToRankIndex = (
  rating: number | null | undefined,
): number => {
  const r = rating ?? 0;
  const count = RANK_THRESHOLDS.filter((t) => t <= r).length;
  return Math.max(0, count - 1);
};

// 自分が勝つ確率(0〜1)
const expectedScore = (rating: number, opponentRating: number): number =>
  1 / (1 + 10 ** ((opponentRating - rating) / ELO_DIVISOR));

// 1人分の増減(保存値)。score は 勝ち=1、引き分け=0.5、負け=0
// opponentGames を省略すると「相手は十分に打っている」とみなす(ボット用)
export const calculateEloDelta = (params: {
  rating: number;
  opponentRating: number;
  games: number;
  opponentGames?: number;
  score: number;
}): number => {
  const isNewcomer = params.games < NEWCOMER_GAMES;
  // 初心者:自分の対局数だけで決まる(相手は見ない)
  // ベテラン:相手の対局数が少ないほど割引(0局で0、30局以上で満額)
  const k = isNewcomer
    ? K_NEWCOMER - K_STEP * params.games
    : K_NORMAL *
      Math.min(1, (params.opponentGames ?? NEWCOMER_GAMES) / NEWCOMER_GAMES);
  const expected = expectedScore(params.rating, params.opponentRating);
  return Math.round(k * SCALE * (params.score - expected));
};