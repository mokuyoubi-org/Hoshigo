// mixedRuns.ts

import { JA_HAN, SC_HAN } from "@/src/constants/hanSets";


type L = "ja" | "zh" | "ko" | "en";
const KNOWN: string[] = ["ja", "zh", "ko", "en"];

// アプリの言語設定を、Mixed 系が扱える言語に変換する(未知なら日本語)
export const resolveUiLang = (lang: string | undefined): L =>
  lang && KNOWN.includes(lang) ? (lang as L) : "ja";

const JA_SET = new Set(Array.from(JA_HAN));
const SC_SET = new Set(Array.from(SC_HAN));

const between = (cp: number, a: number, b: number) => cp >= a && cp <= b;

const isKana = (cp: number) =>
  between(cp, 0x3040, 0x30ff) ||
  between(cp, 0x31f0, 0x31ff) ||
  between(cp, 0xff61, 0xff9f);
const isHangul = (cp: number) =>
  between(cp, 0xac00, 0xd7af) ||
  between(cp, 0x1100, 0x11ff) ||
  between(cp, 0x3130, 0x318f) ||
  between(cp, 0xffa0, 0xffdc);
const isHan = (cp: number) =>
  between(cp, 0x4e00, 0x9fff) ||
  between(cp, 0x3400, 0x4dbf) ||
  between(cp, 0xf900, 0xfaff) ||
  between(cp, 0x20000, 0x2fa1f);
// ラテン拡張・キリル・記号類は EN 担当
const isEnOnly = (cp: number) =>
  between(cp, 0xa1, 0x36f) ||
  between(cp, 0x400, 0x52f) ||
  between(cp, 0x1e00, 0x1eff) ||
  between(cp, 0x20a0, 0x20cf) ||
  between(cp, 0x2190, 0x22ff) ||
  between(cp, 0x25a0, 0x25ff);
const isPinyin = (cp: number) =>
  between(cp, 0xc0, 0x17f) ||
  between(cp, 0x1cd, 0x1dc) ||
  between(cp, 0x1f8, 0x1f9) ||
  cp === 0x251 ||
  cp === 0x261 ||
  between(cp, 0x300, 0x36f) ||
  between(cp, 0x1e3e, 0x1e3f) ||
  between(cp, 0x1ebe, 0x1ec1);

// null = 中立（英数字・空白・句読点など。隣の文字に合わせる）
const classify = (ch: string, ui: L): L | null => {
  const cp = ch.codePointAt(0)!;
  if (isKana(cp)) return "ja";
  if (isHangul(cp)) return "ko";
  if (isHan(cp)) {
    const inJA = JA_SET.has(ch);
    const inSC = SC_SET.has(ch);
    // 中国語UI: SC優先(なければJA) / 日本語UI: JA優先 / それ以外はSC優先
    if (ui === "zh") {
      return inSC ? "zh" : inJA ? "ja" : "zh";
    } else if (ui === "ja") {
      return inJA ? "ja" : inSC ? "zh" : "ja";
    }else {
      return inSC ? "zh" : inJA ? "ja" : "zh";
    }
  }
  if (ui === "zh" && isPinyin(cp)) return null; // 中国語UIではピンインはSCで表示
  if (isEnOnly(cp)) return "en";
  return null;
};

// 🔪 文字列を「同じ言語の連続した塊(run)」に切り分ける
export const splitRuns = (text: string, ui: L) => {
  const chars = Array.from(text);
  const raw = chars.map((c) => classify(c, ui));
  let cur: L = raw.find((l) => l) ?? ui; // 先頭の中立文字は最初の確定文字に合わせる
  const langs = raw.map((l) => (cur = l ?? cur)); // 以降は直前の文字に合わせる

  const runs: { lang: L; text: string }[] = [];
  chars.forEach((ch, i) => {
    const last = runs[runs.length - 1];
    if (last && last.lang === langs[i]) last.text += ch;
    else runs.push({ lang: langs[i], text: ch });
  });
  return runs;
};
