import { createAudioPlayer, AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

type SoundSource = Parameters<typeof createAudioPlayer>[0];

/**
 * 音源のマップ(name -> require()したソース)を渡すと、再生関数を返す汎用hook。
 * ドメインごとの音の種類(SoundName)は呼び出し側で定義し、
 * このhookはTとしてそれをそのまま推論する。
 */
export function useSoundPlayer<T extends string>(sources: Record<T, SoundSource>) {
  const playersRef = useRef<Record<T, AudioPlayer> | null>(null);

  if (!playersRef.current) {
    const players = {} as Record<T, AudioPlayer>;
    for (const key in sources) {
      players[key] = createAudioPlayer(sources[key]);
    }
    playersRef.current = players;
  }

  useEffect(() => {
    return () => {
      if (playersRef.current) {
        Object.values(playersRef.current as Record<string, AudioPlayer>).forEach((player) => {
          player.remove();
        });
      }
    };
  }, []);

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