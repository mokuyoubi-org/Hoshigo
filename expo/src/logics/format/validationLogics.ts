// validationLogics.ts
// 【ファイル全体の責務】
// 「入力データの正しさチェック（バリデーション）」の機能を提供する

import { UsernameValidationError } from "../../types/validation";

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * ユーザー名の「表示幅」の上限。半角=1、全角=1.2、絵文字=1.5として数える。（混在OK）
 * ⚠️ 表の幅は必ず1以上にすること。そうすると「幅6まで」=「最大6文字」になり、
 *    サーバ側 update_username の「6文字まで」と話が合う。(幅1未満の文字を足すとサーバの上限が破れる)
 */
export const MAX_USERNAME_WIDTH = 6;

// JSの小数の足し算はズレることがある(1.2を足していくとぴったり6にならない等)ので、
// 内部では10倍の整数で計算する。(半角=10、全角=12、絵文字=15)
const WIDTH_SCALE = 10;

/**
 * ユーザー名に使ってよい文字の「名簿」。名簿に載っている文字だけOKで、横の数字がその文字の幅(10倍)。
 * 形式: [開始コードポイント, 終了コードポイント, 幅(10倍)]
 * ※ 細かいルールはアプリ側(ここ)が主役。サーバは「6文字まで・危険な文字の拒否・重複」だけの最低限の鍵。
 * ※ スペース・全角スペース・ヨーロッパ系の文字(é・ギリシャ・キリル)は載せていない=使えない
 */
const CHAR_WIDTH_TABLE: readonly (readonly [number, number, number])[] = [
  [33, 126, 10], //        半角英数字・記号(スペース以外)
  [65377, 65439, 10], //   半角カナ
  [65281, 65376, 12], //   全角英数字・記号
  [12289, 12799, 12], //   CJK記号・ひらがな・カタカナ・ハングル互換字母など
  [13312, 40959, 12], //   漢字
  [44032, 55203, 12], //   ハングル音節
  [9728, 10175, 15], //    絵文字(その他の記号・Dingbats)
  [11008, 11263, 15], //   絵文字(⭐など)
  [127462, 129791, 15], // 絵文字(国旗〜絵文字拡張A)
];

// 1文字(コードポイント)の幅を返す。名簿に載っていなければ null
const getCharWidth = (cp: number): number | null => {
  for (const [start, end, width] of CHAR_WIDTH_TABLE) {
    if (cp >= start && cp <= end) return width;
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
    const width = getCharWidth(ch.codePointAt(0)!);
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
