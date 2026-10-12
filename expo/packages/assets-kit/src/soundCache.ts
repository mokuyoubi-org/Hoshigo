// assets-kit/src/soundCache.ts
//
// AudioPlayerを音ごとに1つだけ作って、アプリ全体で使い回す仕組み。
// 音は同梱ファイル(require したもの)なので、いつでも同期で作れる。

import { AudioPlayer, AudioSource, createAudioPlayer } from "expo-audio";

// 🎒 同梱ファイル(requireの結果)だけを受け付ける型。
//    文字列を弾くことで、古い呼び出し("stone.mp3")を型エラーで見つけられる
export type SoundSource = Exclude<AudioSource, string | null>;

const players = new Map<SoundSource, AudioPlayer>();

/**
 * プレイヤーを返す。まだ無ければ、その場で作る(同期)。
 */
export const getPlayer = (source: SoundSource): AudioPlayer => {
  let player = players.get(source);
  if (!player) {
    player = createAudioPlayer(source);
    players.set(source, player);
  }
  return player;
};

/**
 * 起動時などに呼んで、プレイヤーを先に作っておく(初回再生のラグを減らす)。
 */
export const preloadSounds = (sources: SoundSource[]): void => {
  sources.forEach(getPlayer);
};