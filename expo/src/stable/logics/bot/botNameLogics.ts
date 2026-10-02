// botNameLogics.ts

import { dictionary } from "@/src/active/i18n/dictionary"; // パスは直してください
import { TFunction } from "@/src/active/i18n/types";

export const botNameFormatter = (username: string, t: TFunction) => {
  if (username === "bot1") {
    return t("BotName.bot1");
  } else if (username === "bot2") {
    return t("BotName.bot2");
  } else if (username === "bot3") {
    return t("BotName.bot3");
  } else {
    return username;
  }
};

// 比べるときだけ「NFKC(全角・半角をそろえる) + 小文字化」をかける。
// これで mint / MINT / Ｍｉｎｔ / ﾗﾑﾈ などのそっくり名前も同じ名前として扱える。
const normalizeForCompare = (text: string): string =>
  text.normalize("NFKC").toLowerCase();

// ユーザーが使えないボットの名前を、辞書(BotName)から自動で集める
const BOT_NAMES: string[] = Object.values(dictionary.BotName).flatMap(
  (names) => [
    ...Object.keys(names), // 内部名(bot1, bot2, bot3)
    ...Object.values(names), // 各言語の表示名
  ],
);

const NORMALIZED_BOT_NAMES = BOT_NAMES.map(normalizeForCompare);

/**
 * ボットの名前と同じ名前かどうかを判定する関数。
 * 「すでに使われている」扱いにするために使う。
 */
export const isBotName = (username: string): boolean =>
  NORMALIZED_BOT_NAMES.includes(normalizeForCompare(username));
