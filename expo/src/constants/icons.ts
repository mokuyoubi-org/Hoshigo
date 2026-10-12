// constants/images.ts
//
// プロフィールアイコンの一覧。アプリに同梱された画像(requireの結果)なので、
// ダウンロードもプリロードも不要。
// 画像を足す・変える時は、アプリのビルドをし直す。

import { ImageSourcePropType } from "react-native";

export const ICONS: Record<number | string, ImageSourcePropType> = {
  // 自分
  0: require("@/assets/images/chick.png"),
  1: require("@/assets/images/frog.png"),
  2: require("@/assets/images/jellyfish.png"),
  3: require("@/assets/images/fox.png"),
  4: require("@/assets/images/owl.png"),
  5: require("@/assets/images/koala.png"),

  6: require("@/assets/images/rabbit.png"),
  7: require("@/assets/images/cat.png"),
  8: require("@/assets/images/wolf.png"),

  // ボット
  100: require("@/assets/images/bot1.png"),
  101: require("@/assets/images/bot2.png"),
  102: require("@/assets/images/bot3.png"),
};