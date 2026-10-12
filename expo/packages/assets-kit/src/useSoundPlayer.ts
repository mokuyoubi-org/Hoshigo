// assets-kit/src/useSoundPlayer.ts

import { useCallback, useEffect, useRef } from "react";
import { getPlayer, SoundSource } from "./soundCache";

/**
 * 音のマップ(name -> 同梱ファイル)を渡すと、再生関数を返す汎用hook。
 * ドメインごとの音の種類(SoundName)は呼び出し側で定義し、
 * このhookはTとしてそれをそのまま推論する。
 *
 * 例: useSoundPlayer({ stone: SOUNDS.stone, pass: SOUNDS.pass })
 *
 * AudioPlayer自体はsoundCache側で使い回されるので、
 * このhookが何度マウント/アンマウントされても、同じプレイヤーが再利用される。
 */
export const useSoundPlayer = <T extends string>(
  sounds: Record<T, SoundSource>,
) => {
  // 📌 最初に渡されたマップを覚えておく(毎回新しいオブジェクトが渡されても影響しない)
  const soundsRef = useRef(sounds);

  // 🛒 マウント時に、この画面で使う音のプレイヤーを作っておく(作成済みなら何も起きない)
  useEffect(() => {
    for (const name in soundsRef.current) {
      getPlayer(soundsRef.current[name]);
    }
  }, []);

  // 🔊プレイヤーは共有・使い回すため、アンマウント時のremove()は行わない。
  // (他の画面が同じ音を使い回している可能性があるため)

  const playSound = useCallback(async (name: T, volume: number = 1.0) => {
    try {
      const player = getPlayer(soundsRef.current[name]);
      player.volume = volume;
      await player.seekTo(0);
      await player.play();
    } catch (error) {
      console.warn(`Failed to play ${name} sound:`, error);
    }
  }, []);

  return { playSound };
};