// validationLogics.ts
// 【ファイル全体の責務】
// 「入力データの正しさチェック（バリデーション）」の機能を提供する

import { JA_HAN, SC_HAN } from "@/src/constants/hanSets";
import { UsernameValidationError } from "../../types/validation";

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * ユーザー名の「表示幅」の上限。文字の種類ごとに、ざっくり決めた幅で数える。
 *   数字 = 10 / 半角英字 = 15 / ひらがな・カタカナ・ハングル・漢字 = 20 / 絵文字 = 25
 * ⚠️ 幅は必ず10以上にすること。そうすると「幅120まで」=「最大12文字」になり、
 *    サーバ側 update_username の「12文字まで」と話が合う。
 */
const MAX_USERNAME_WIDTH = 120;

type Range = readonly [number, number];

const inRanges = (cp: number, ranges: readonly Range[]): boolean =>
  ranges.some(([start, end]) => cp >= start && cp <= end);

// 数字(0〜9)
const DIGIT_WIDTH = 10;
const DIGIT_RANGE: readonly Range[] = [[48, 57]];

// 半角英字(a-z, A-Z)と - _
const LATIN_WIDTH = 15;
const LATIN_RANGES: readonly Range[] = [
  [65, 90], //  A-Z
  [97, 122], // a-z
  [45, 45], //  -
  [95, 95], //  _
];

// ひらがな・カタカナ・ハングル(範囲で判定)
const KANA_HANGUL_WIDTH = 20;
const KANA_HANGUL_RANGES: readonly Range[] = [
  [12353, 12447], // ひらがな
  [12448, 12543], // カタカナ(・ー も入る)
  [12593, 12643], // ハングル字母(ㄱㅏなど)
  [44032, 55203], // ハングル音節
];

// 漢字名簿: フォントが用意されている漢字だけOK。名簿にない漢字は使えない。
const ALLOWED_HAN: ReadonlySet<string> = new Set([...JA_HAN, ...SC_HAN]);
const HAN_WIDTH = 20;

// 絵文字(範囲で判定)。国旗と、新しい拡張の絵文字は使えない。
const EMOJI_WIDTH = 25;
const EMOJI_RANGES: readonly Range[] = [
  [9728, 10175], //   その他の記号・Dingbats
  [11008, 11263], //  ⭐など
  [127744, 129535], // 😀🍎🚗🦊など(国旗と拡張Aは含まない)
];

// 1文字の幅を返す。使えない文字なら null
const getCharWidth = (ch: string): number | null => {
  const cp = ch.codePointAt(0)!;

  if (inRanges(cp, DIGIT_RANGE)) return DIGIT_WIDTH;
  if (inRanges(cp, LATIN_RANGES)) return LATIN_WIDTH;
  if (inRanges(cp, KANA_HANGUL_RANGES)) return KANA_HANGUL_WIDTH;
  if (ALLOWED_HAN.has(ch)) return HAN_WIDTH;
  if (inRanges(cp, EMOJI_RANGES)) return EMOJI_WIDTH;
  return null;
};

// 絵文字の見えない付け足しパーツ(FE0F=絵文字の見た目にする付箋 / 200D=絵文字をつなぐのり)
// 見えないのに別の名前になってしまう(そっくり名前の原因)ので、最初に取り除く
const INVISIBLE_PARTS_REGEX = /[\uFE0F\u200D]/g;

export const normalizeUsername = (text: string): string =>
  text.normalize("NFC").replace(INVISIBLE_PARTS_REGEX, "");

export const validateUsername = (text: string): UsernameValidationError => {
  const normalizedText = normalizeUsername(text);

  if (!normalizedText) {
    return "required";
  }

  let totalWidth = 0;
  for (const ch of normalizedText) {
    const width = getCharWidth(ch);
    if (width === null) {
      return "invalidFormat"; // 使えない文字
    }
    totalWidth += width;
  }

  if (totalWidth > MAX_USERNAME_WIDTH) {
    return "length";
  }
  return null;
};

// 比べるときだけ「NFKC(全角・半角をそろえる) + 小文字化」をかける。
// これで mint / MINT / Ｍｉｎｔ / ﾗﾑﾈ などのそっくり名前も同じ名前として扱える。
const normalizeForCompare = (text: string): string =>
  text.normalize("NFKC").toLowerCase();

// ユーザーが使えないボットの名前
const RESERVED_NAMES: string[] = [
  "Mint",
  "Soda",
  "Muffin",

  "みんと",
  "らむね",
  "まろん",

  "쑥", // よもぎ
  "소다", // ソーダ
  "밤", // 栗

  "豆豆", // 豆
  "泡泡", // 泡
  "芋芋", // 芋

  "you",
];

const NORMALIZED_RESERVED_NAMES = RESERVED_NAMES.map(normalizeForCompare);

/**
 * ボットの名前と同じ名前かどうかを判定する関数。
 * 「すでに使われている」扱いにするために使う。
 */
export const isReservedName = (username: string): boolean =>
  NORMALIZED_RESERVED_NAMES.includes(normalizeForCompare(username));
