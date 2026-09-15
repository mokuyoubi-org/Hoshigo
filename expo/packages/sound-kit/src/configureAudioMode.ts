// sound-kit/src/configureAudioMode.ts
//
// 効果音を鳴らした時に、裏で流れているBGM(他の音)が
// 止まったり中断されたりしないようにするための設定。
// アプリ起動時に一度だけ呼び出せばよい。

import { setAudioModeAsync } from "expo-audio";

export const configureAudioMode = async (): Promise<void> => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
  } catch (error) {
    console.warn("Failed to configure audio mode:", error);
  }
};