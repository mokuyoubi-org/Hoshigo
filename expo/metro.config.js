// expo/metro.config.js
// no_touch_nor_understanding
// metroというのはexpoのソースコードを実際にアプリにするときの引っ越し屋さん。
// その引っ越し屋さんに、gzファイルもちゃんと段ボールに詰めてくださいって伝えているのがこのファイル

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("gz", "mp3");

module.exports = withNativeWind(config, { input: "./global.css" });


