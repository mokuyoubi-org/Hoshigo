// constants/sounds.ts
//
// アプリに同梱する効果音の一覧。
// ビルドに含まれるので、ダウンロードも保存も不要。
// 音を足す・変える時は、アプリのビルドをし直す。

export const SOUNDS = {
  stone: require("../../assets/sounds/stone.mp3"),
  pass: require("../../assets/sounds/pass.mp3"),
} as const;
