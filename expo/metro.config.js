// expo/metro.config.js
// no_touch_nor_understanding
// metroというのはexpoのソースコードを実際にアプリにするときの引っ越し屋さん。
// その引っ越し屋さんに、gzファイルもちゃんと段ボールに詰めてください！って伝えているのがこのファイル

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("gz");

module.exports = config;
