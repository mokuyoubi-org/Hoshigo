// metro.config.js
// Metroくん(引っ越し屋さん)への指示書。
// ※tsには変更不可。

// ===== 前半: ターミナルのうるさい警告ログを黙らせる =====
// 元の console.warn を取っておく。
const originalWarn = console.warn;

// console.warn を「門番付き」の関数に差し替える。
console.warn = (...args) => {
  // 警告の中身を、1本の文字列にまとめる。
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");

  // うるさいキーワードが入っていたら、表示せずに捨てる。
  if (msg.includes("already registered") || msg.includes("already set")) {
    return;
  }

  // それ以外の警告は、元の console.warn で普通に表示する。
  originalWarn(...args);
};

// ===== 後半: 設定本体 =====
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// まず、Expo標準のMetro設定を持ってくる。
const config = getDefaultConfig(__dirname);

// 「素材(asset)」として扱う拡張子を追加する。
// 追加しないと、Metroくんが「知らない形式だ」と止まってしまう。
// ※新しい形式の素材を使いたくなったら、ここに足す(時々触る場所)。
config.resolver.assetExts.push("gz", "mp3", "woff2");

// NativeWindの設定を上乗せする。
// input は、Tailwindの道具箱(global.css)の場所を教えている。
module.exports = withNativeWind(config, { input: "./global.css" });