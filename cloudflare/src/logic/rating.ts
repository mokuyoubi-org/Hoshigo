// rating.ts

// ランクの境目(10k〜2k、1k〜8D)。レーティングがこの値以上なら、そのランクに入る。
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

// レーティング → ランクの番号(0 = 10k)
export function ratingToRankIndex(rating: number | null | undefined): number {
  const r = rating ?? 0;
  const count = RANK_THRESHOLDS.filter((t) => t <= r).length;
  return Math.max(0, count - 1);
}

// 引き分けのときの増減。
// ボット戦は増減なし。ふつうの対局は、「勝った場合」と「負けた場合」のちょうど平均(-10〜+10)。
export function calculateDrawDelta(params: {
  isBotMatch: boolean;
  blackRating: number | null | undefined;
  whiteRating: number | null | undefined;
}): { blackDelta: number; whiteDelta: number } {
  if (params.isBotMatch) {
    return { blackDelta: 0, whiteDelta: 0 };
  }

  // 白のランク - 黒のランク(正なら、黒から見て、相手が格上)
  const rankDiff =
    ratingToRankIndex(params.whiteRating) -
    ratingToRankIndex(params.blackRating);

  const blackDelta = Math.max(-10, Math.min(10, rankDiff));
  return { blackDelta, whiteDelta: 0 - blackDelta };
}

// 勝敗がついたときの増減と、格上に勝った連勝の数
export function calculateMatchDelta(params: {
  winner: "black" | "white";
  blackRating: number | null | undefined;
  whiteRating: number | null | undefined;
  blackGiantKillingStreak: number | null | undefined;
  whiteGiantKillingStreak: number | null | undefined;
  blackGames: number | null | undefined;
  whiteGames: number | null | undefined;
  isBotMatch: boolean;
}): {
  winnerDelta: number;
  loserDelta: number;
  winnerGiantKillingStreak: number;
  loserGiantKillingStreak: number;
} {
  const blackWon = params.winner === "black";

  const winnerRank = ratingToRankIndex(
    blackWon ? params.blackRating : params.whiteRating,
  );
  const loserRank = ratingToRankIndex(
    blackWon ? params.whiteRating : params.blackRating,
  );
  const winnerStreak =
    (blackWon
      ? params.blackGiantKillingStreak
      : params.whiteGiantKillingStreak) ?? 0;
  const winnerGames = (blackWon ? params.blackGames : params.whiteGames) ?? 0;

  // 負けた側のランク - 勝った側のランク(正なら、格上に勝った)
  const rankDiff = loserRank - winnerRank;

  // 格上に勝ったら、連勝が1つ増える(上限なし)
  const winnerGiantKillingStreak = winnerStreak + (rankDiff > 0 ? 1 : 0);

  // 勝ったときの基本の増減。ボット戦は固定で5、ふつうの対局はランク差で決まる(0〜20)
  const winDelta = params.isBotMatch
    ? 5
    : Math.max(0, Math.min(20, 10 + rankDiff));

  // 格上に勝ったときは、増減が連勝の数だけ増える(ボット戦も同じ)
  const winnerDelta =
    rankDiff > 0 ? winDelta * winnerGiantKillingStreak : winDelta;

  // 負けた側の増減。ボット戦は固定で -5。
  // ふつうの対局は、格上に30局以内の人が勝ったときだけ、負けた側は減らない
  const loserDelta = params.isBotMatch
    ? -5
    : rankDiff > 0 && winnerGames <= 30
      ? 0
      : -winDelta;

  return {
    winnerDelta,
    loserDelta,
    winnerGiantKillingStreak,
    loserGiantKillingStreak: 0,
  };
}
