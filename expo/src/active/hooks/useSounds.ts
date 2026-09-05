import { useAudioPlayer } from "expo-audio";
import { useCallback } from "react";

// 音の種類の定義
export type SoundName = "gamestart" | "pip";

export const useSounds = () => {
  // すべての音ソースをオブジェクトで管理
  const sounds = {
    gamestart: useAudioPlayer(require("../../../assets/sounds/gamestart.mp3")),
    pip: useAudioPlayer(require("../../../assets/sounds/pip.mp3")),
  };

  // 音の名前と音量（0.0 〜 1.0）を受け取って再生する関数
  const playSound = useCallback(
    async (name: SoundName, volume: number = 1.0) => {
      try {
        const player = sounds[name];
        if (!player) return;

        // 音の大きさを設定する（例: 0.5 なら半分の音量）
        player.volume = volume;

        await player.seekTo(0);
        await player.play();
      } catch (error) {
        console.warn(`Failed to play ${name} sound:`, error);
      }
    },
    [sounds],
  );

  return { playSound };
};
