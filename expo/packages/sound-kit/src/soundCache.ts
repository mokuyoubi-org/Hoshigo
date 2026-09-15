// sound-kit/src/soundCache.ts
//
// AudioPlayerをURLごとにキャッシュしておく、アプリ全体で共有される仕組み。
// 同じURLに対して二重にダウンロード・生成が走らないようにする。

import { AudioPlayer, createAudioPlayer } from "expo-audio";

type SoundSource = Parameters<typeof createAudioPlayer>[0];

const playerCache = new Map<string, AudioPlayer>();

const getCacheKey = (source: SoundSource): string => {
  // sourceは基本的にURL文字列(リモート音源)を想定
  return typeof source === "string" ? source : JSON.stringify(source);
};

/**
 * 指定した音源のAudioPlayerを取得する。
 * 既にキャッシュにあればそれを返し、無ければ新規作成してキャッシュする。
 */
export const getOrCreatePlayer = (source: SoundSource): AudioPlayer => {
  const key = getCacheKey(source);
  const cached = playerCache.get(key);
  if (cached) return cached;

  const player = createAudioPlayer(source);
  playerCache.set(key, player);
  return player;
};

/**
 * 起動時などに事前に呼んでおくことで、音源のダウンロード/デコードを
 * 前もって開始しておくための関数。戻り値は使わなくてよい。
 */
export const preloadSounds = (sources: SoundSource[]): void => {
  sources.forEach((source) => {
    getOrCreatePlayer(source);
  });
};