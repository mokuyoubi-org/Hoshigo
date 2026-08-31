// textFormatter.ts

import { TranslationKey } from "@/src/active/language/lang";
import { BLACK, Color, MatchType, WHITE } from "expo-goband";

// "B+R"のような結果を、you won by resignationのようなコメントへ変換。
export const resultToComment = (
  result: string,
  playerColor: Color,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string => {
  if (result === "DRAW") {
    return t("GameResult.draw");
  } else if (
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
  }

  // 想定外のresult文字列。undefinedではなく空文字を返す（呼び出し側がstring前提で使えるように）
  return "";
};

// "B+R"のような結果を、Reasonと勝敗を使ってシンプルに変換するにゃ！
export const resultToCommentSimple = (
  result: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string => {
  if (result === "DRAW") return t("Reason.draw");

  const [winnerStr, reasonCode] = result.split("+");
  if (!winnerStr || !reasonCode) return "";

  // 理由（Reason）のキーをマッピングするにゃ
  const reasonMap: Record<string, string> = {
    R: t("Reason.resignation"),
    T: t("Reason.timeout"),
    C: t("Reason.disconnection"),
  };

  // R, T, C の場合の処理だにゃ
  if (reasonMap[reasonCode]) {
    return `${reasonMap[reasonCode]}`;
  }

  // 数字（点数差）の場合の処理だにゃ
  return `${t("Reason.points", { points: reasonCode })}`;
};

export const matchTypeToText = (
  matchType: MatchType,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string => {
  return t(`MatchType.matchType_${matchType}` as TranslationKey);
};