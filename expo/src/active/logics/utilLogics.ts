import { BLACK, Color, WHITE } from "@/src/stable/types/goTypes";
import { TranslationKey } from "../types/translationTypes";

// あと何ポイントで昇級か、をあと何勝かに変換。
export const pointsToWins = (points: number): number => {
  return Math.ceil(points / 10);
};

// "B+R"のような結果を、you won by resignationのようなコメントへ変換。
export const resultToComment = (
  result: string,
  playerColor: Color,
  t: (key: TranslationKey, params?: any) => string,
) => {
  if (
    (result === "W+R" && playerColor === WHITE) ||
    (result === "B+R" && playerColor === BLACK)
  ) {
    return t("GameResult.yourResignationWin");
  } else if (
    (result === "W+R" && playerColor === BLACK) ||
    (result === "B+R" && playerColor === WHITE)
  ) {
    return t("GameResult.yourResignationLoss");
  } else if (
    (result === "W+T" && playerColor === WHITE) ||
    (result === "B+T" && playerColor === BLACK)
  ) {
    return t("GameResult.yourTimeoutWin");
  } else if (
    (result === "W+T" && playerColor === BLACK) ||
    (result === "B+T" && playerColor === WHITE)
  ) {
    return t("GameResult.yourTimeoutLoss");
  } else if (
    (result === "W+C" && playerColor === WHITE) ||
    (result === "B+C" && playerColor === BLACK)
  ) {
    return t("GameResult.yourDisconnectWin");
  } else if (
    (result === "W+C" && playerColor === BLACK) ||
    (result === "B+C" && playerColor === WHITE)
  ) {
    return t("GameResult.yourDisconnectLoss");
  } else if (
    (result[0] === "B" && playerColor === BLACK) ||
    (result[0] === "W" && playerColor === WHITE)
  ) {
    const points = result.slice(2);
    return t("GameResult.yourPointsWin", { points });
  } else if (
    (result[0] === "W" && playerColor === BLACK) ||
    (result[0] === "B" && playerColor === WHITE)
  ) {
    const points = result.slice(2);
    return t("GameResult.yourPointsLoss", { points });
  } else {
    return;
  }
};

// 秒を分に変換。例えば、180を3:00に変換。
export const secondsToMinutes = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60); // 分
  const seconds = totalSeconds % 60; // 残り秒
  const paddedSeconds = seconds.toString().padStart(2, "0"); // 0埋め
  return `${minutes}:${paddedSeconds}`;
};
