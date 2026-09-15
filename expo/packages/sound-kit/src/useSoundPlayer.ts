// sound-kit/src/useSoundPlayer.ts

import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { getOrCreatePlayer } from "./soundCache";

type SoundSource = Parameters<typeof createAudioPlayer>[0];

/**
 * 音源のマップ(name -> URLなどのソース)を渡すと、再生関数を返す汎用hook。
 * ドメインごとの音の種類(SoundName)は呼び出し側で定義し、
 * このhookはTとしてそれをそのまま推論する。
 *
 * AudioPlayer自体はsoundCache側でURLごとに使い回されるので、
 * このhookが何度マウント/アンマウントされても、事前にpreloadSoundsで
 * 温めておいたプレイヤーがそのまま再利用される。
 */
export function useSoundPlayer<T extends string>(
  sources: Record<T, SoundSource>,
) {
  const playersRef = useRef<Record<T, AudioPlayer> | null>(null);

  if (!playersRef.current) {
    const players = {} as Record<T, AudioPlayer>;
    for (const key in sources) {
      players[key] = getOrCreatePlayer(sources[key]);
    }
    playersRef.current = players;
  }

  // 🔊プレイヤーはsoundCacheで共有・使い回すため、
  // ここでのアンマウント時のremove()は行わない。
  // (他の画面が同じ音を使い回している可能性があるため)

  const playSound = useCallback(async (name: T, volume: number = 1.0) => {
    try {
      const player = playersRef.current?.[name];
      // 🛡️ガード
      if (!player) return;

      player.volume = volume;
      await player.seekTo(0);
      await player.play();
    } catch (error) {
      console.warn(`Failed to play ${name} sound:`, error);
    }
  }, []);

  return { playSound };
}