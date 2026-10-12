// constants/sounds.ts
//
// アプリに同梱する効果音の一覧。
// ビルドに含まれるので、ダウンロードも保存も不要。
// 音を足す・変える時は、アプリのビルドをし直す。

export const SOUNDS = {
  gamestart: require("@/assets/sounds/gamestart.mp3"),
  pip: require("@/assets/sounds/pip.mp3"),
} as const;
