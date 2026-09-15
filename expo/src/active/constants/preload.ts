// constants/preload.ts (新規)
//
// アプリ起動時に、画像・音声を事前に読み込んでおくための関数。
// ロード画面の間にこれを呼んでおくことで、実際の画面遷移後の
// 表示・再生のラグを減らす。

import { Image } from "react-native";
import { getSoundUrl, preloadSounds } from "sound-kit";
import { ICONS } from "./icons";

export const preloadAssets = async (): Promise<void> => {
  // 画像(アイコン)のプリロード
  const imageUrls = Object.values(ICONS)
    .map((source) =>
      typeof source === "object" && "uri" in source ? source.uri : null,
    )
    .filter((uri): uri is string => uri !== null);

  const imagePreload = Promise.all(
    imageUrls.map((uri) => Image.prefetch(uri)),
  );

  // 音声のプリロード(gamestart/pip/stone/pass など、使ってる全音源)
  preloadSounds([
    getSoundUrl("gamestart.mp3"),
    getSoundUrl("pip.mp3"),
    getSoundUrl("stone.mp3"),
    getSoundUrl("pass.mp3"),
  ]);

  await imagePreload;
};