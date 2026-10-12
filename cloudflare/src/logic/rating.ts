// rating.ts

// ランクの境目(10k〜2k、1k〜8D)。レーティングがこの値以上なら、そのランクに入る。
const RANK_THRESHOLDS = [
  0, 20, 60, 120, 200, 300, 420, 560, 720, // 10k ~ 2k
  900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, // 1k ~ 8D
] as const;

// 格上に勝った連勝は、最大50連勝まで数える
const GIANT_KILLING_STREAK_CAP = 50;

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
    ratingToRankIndex(params.whiteRating) - ratingToRankIndex(params.blackRating);

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
    (blackWon ? params.blackGiantKillingStreak : params.whiteGiantKillingStreak) ?? 0;
  const loserStreak =
    (blackWon ? params.whiteGiantKillingStreak : params.blackGiantKillingStreak) ?? 0;
  const winnerGames = (blackWon ? params.blackGames : params.whiteGames) ?? 0;

  // 負けた側のランク - 勝った側のランク(正なら、格上に勝った)
  const rankDiff = loserRank - winnerRank;

  // ボット戦は、固定で +5 / -5。連勝には触らない
  if (params.isBotMatch) {
    return {
      winnerDelta: 5,
      loserDelta: -5,
      winnerGiantKillingStreak: winnerStreak,
      loserGiantKillingStreak: loserStreak,
    };
  }

  // ランク差1つにつき±1。同ランクなら10、差が10個以上なら、0〜20でしばる
  const winDelta = Math.max(0, Math.min(20, 10 + rankDiff));

  // 格上に勝ったら、連勝が1つ増える(最大50)
  const winnerGiantKillingStreak = Math.min(
    GIANT_KILLING_STREAK_CAP,
    winnerStreak + (rankDiff > 0 ? 1 : 0),
  );

  // 格上に勝ったときは、増減が連勝の数だけ増える
  const winnerDelta =
    rankDiff > 0 ? winDelta * winnerGiantKillingStreak : winDelta;

  // 格上に、30局以内の人が勝ったときは、負けた側は減らない
  const loserDelta = rankDiff > 0 && winnerGames <= 30 ? 0 : -winDelta;

  return {
    winnerDelta,
    loserDelta,
    winnerGiantKillingStreak,
    loserGiantKillingStreak: 0,
  };
}