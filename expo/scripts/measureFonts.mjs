// measureFonts.mjs
// フォントのファイルを読んで、文字ごとの横幅を測り、結果を表示する(パソコン上で1回だけ使う道具)
// 使い方:
/*
まず
cd ~/Hoshigo/expo
npm install --save-dev opentype.js 
で用意。そして、
cd ~/Hoshigo/expo
node scripts/measureFonts.mjs
*/
// → src/constants/measuredWidths.ts が作り直される。
// いつ使う?: 名前に使える文字を足したとき / assets/fonts のフォントを作り直したとき
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const FONT_DIR = "assets/fonts";

// 文字 → どのフォントで測るか。上から順に、最初に「その文字が入っているフォント」を使う
const FONT_FILES = [
  "HanRoundedEN.ttf",
  "HanRoundedJA.ttf",
  "HanRoundedSC.ttf",
  "HanRoundedKO.ttf",
];

const fonts = FONT_FILES.map((name) => {
  const buf = fs.readFileSync(path.join(FONT_DIR, name));
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  );
  // eslint-disable-next-line import/no-named-as-default-member
  return { name, font: opentype.parse(arrayBuffer) };
});

// 文字の幅(フォントの大きさ=1 としたときの割合)を返す。どのフォントにも無ければ null
const measure = (ch) => {
  for (const { font } of fonts) {
    const glyph = font.charToGlyph(ch);
    if (glyph && glyph.index !== 0) {
      return glyph.advanceWidth / font.unitsPerEm;
    }
  }
  return null;
};

// ---- 全部の文字を測って、表のファイルを作る ----
const BASE_WIDTH = measure("a"); // 基準: 「a」の幅 = 1文字分
const SCALE = 10; // 10倍の整数で持つ(1文字分=10)

// 測りたい文字の一覧(名前に使えるもの)
const chars = [];
const addRange = (start, end) => {
  for (let cp = start; cp <= end; cp++) chars.push(String.fromCodePoint(cp));
};
addRange(48, 57); //       半角数字
addRange(65, 90); //       大文字
addRange(97, 122); //      小文字
chars.push("-", "_");
addRange(65382, 65439); // 半角カナ
addRange(65296, 65305); // 全角数字
addRange(65313, 65338); // 全角大文字
addRange(65345, 65370); // 全角小文字
chars.push("々", "〜", "～", "・", "ー");
addRange(12353, 12438); // ひらがな
addRange(12449, 12538); // カタカナ

const entries = [];
for (const ch of chars) {
  const w = measure(ch);
  if (w === null) continue; // フォントに無い文字は、表に入れない=使えない
  // 基準との比を10倍の整数にする。最低でも10(=1文字分)に切り上げ
  const scaled = Math.max(SCALE, Math.round((w / BASE_WIDTH) * SCALE));
  entries.push([ch, scaled]);
}

// 同じ幅の文字をまとめて「幅: 文字たち」の形にする
const byWidth = new Map();
for (const [ch, scaled] of entries) {
  byWidth.set(scaled, (byWidth.get(scaled) ?? "") + ch);
}

let out = "// 自動生成(scripts/measureFonts.mjs)。手で直さないこと。\n";
out += "// 幅は「a=10」としたときの10倍の整数。最低10。\n";
out += "export const MEASURED_WIDTHS: Record<number, string> = {\n";
for (const [w, str] of [...byWidth.entries()].sort((a, b) => a[0] - b[0])) {
  out += `  ${w}: ${JSON.stringify(str)},\n`;
}
out += "};\n";

fs.writeFileSync("src/constants/measuredWidths.ts", out);
console.log("作成: src/constants/measuredWidths.ts", `(${entries.length}文字)`);
