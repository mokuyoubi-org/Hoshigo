// constants/preload.ts
//
// アプリ起動時に、画像・音声を事前に読み込んでおくための関数。
// ロード画面の間にこれを呼んでおくことで、実際の画面遷移後の
// 表示・再生のラグを減らす。
// 音声はアプリに同梱されているので、プレイヤーを作っておくだけ。

import { preloadSounds } from "assets-kit";
import { Image } from "expo-image";
import { ICONS } from "./icons";
import { SOUNDS } from "./sounds";

export const preloadAssets = async (): Promise<void> => {
  // 音声のプリロード(同期。全音源のプレイヤーを作っておく)
  preloadSounds(Object.values(SOUNDS));

  // 画像(アイコン)のプリロード
  const imageUrls = Object.values(ICONS)
    .map((source) =>
      typeof source === "object" && "uri" in source ? source.uri : null,
    )
    .filter((uri): uri is string => uri !== null);

  await Promise.all(imageUrls.map((uri) => Image.prefetch(uri)));
};
