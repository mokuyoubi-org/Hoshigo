// validationLogics.ts
// 【ファイル全体の責務】
// 「入力データの正しさチェック（バリデーション）」の機能を提供する

import { JA_HAN, SC_HAN } from "@/src/constants/hanSets";
import { MEASURED_WIDTHS } from "@/src/constants/measuredWidths";
import { UsernameValidationError } from "../../types/validation";

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * ユーザー名の「表示幅」の上限。実際のフォントで測った幅で数える。(混在OK)
 * 基準は「a の幅 = 1」。m・W・大文字・ひらがななどは1より大きく、i や l は1に切り上げる。
 * ⚠️ 幅は必ず1以上にすること。そうすると「幅12まで」=「最大12文字」になり、
 *    サーバ側 update_username の「12文字まで」と話が合う。(幅1未満の文字を足すとサーバの上限が破れる)
 */
export const MAX_USERNAME_WIDTH = 12;

// JSの小数の足し算はズレることがあるので、内部では10倍の整数で計算する。
const WIDTH_SCALE = 10;

// 測った幅の表(MEASURED_WIDTHS)を「文字 → 幅」の引き出しに組み替える。
// 表に載っている文字だけOK。載っていない文字(記号など)は使えない。
const MEASURED_WIDTH_MAP: ReadonlyMap<string, number> = new Map(
  Object.entries(MEASURED_WIDTHS).flatMap(([width, chars]) =>
    [...chars].map((ch) => [ch, Number(width)] as const),
  ),
);

// 漢字名簿: フォントが用意されている漢字だけOK。名簿にない漢字は使えない。
const ALLOWED_HAN: ReadonlySet<string> = new Set([...JA_HAN, ...SC_HAN]);
const HAN_WIDTH = 18; // 漢字は正方形(ひらがなと同じ幅)

// 絵文字は測れないので、範囲で判定して固定の幅にする
const EMOJI_RANGES: readonly (readonly [number, number])[] = [
  [9728, 10175], //   その他の記号・Dingbats
  [11008, 11263], //  ⭐など
  [127462, 129791], // 国旗〜絵文字拡張A
];
const EMOJI_WIDTH = 24; // 絵文字は24

// ハングルは全部同じ幅なので、測らずに範囲で判定して固定の幅にする
const HANGUL_RANGES: readonly (readonly [number, number])[] = [
  [12593, 12643], // ハングル字母(ㄱㅏなど)
  [44032, 55203], // ハングル音節
];
const HANGUL_WIDTH = 16; // ハングルは16

// 1文字の幅を返す。名簿に載っていなければ null
const getCharWidth = (ch: string): number | null => {
  const cp = ch.codePointAt(0)!;

  for (const [start, end] of HANGUL_RANGES) {
    if (cp >= start && cp <= end) return HANGUL_WIDTH;
  }

  const measured = MEASURED_WIDTH_MAP.get(ch);
  if (measured !== undefined) return measured;

  if (ALLOWED_HAN.has(ch)) return HAN_WIDTH;

  for (const [start, end] of EMOJI_RANGES) {
    if (cp >= start && cp <= end) return EMOJI_WIDTH;
  }
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

  let scaledWidth = 0;
  for (const ch of normalizedText) {
    const width = getCharWidth(ch);
    if (width === null) {
      return "invalidFormat"; // 名簿に載っていない文字
    }
    scaledWidth += width;
  }

  if (scaledWidth > MAX_USERNAME_WIDTH * WIDTH_SCALE) {
    return "length";
  }
  return null;
};

// 比べるときだけ「NFKC(全角・半角をそろえる) + 小文字化」をかける。
// これで mint / MINT / Ｍｉｎｔ / ﾗﾑﾈ などのそっくり名前も同じ名前として扱える。
const normalizeForCompare = (text: string): string =>
  text.normalize("NFKC").toLowerCase();

// ユーザーが使えないボットの名前を、辞書(BotName)から自動で集める
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
