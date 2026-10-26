// assets-kit/src/configureAudioMode.ts
//
// 効果音を鳴らした時に、裏で流れているBGM(他の音)が
// 止まったり中断されたりしないようにするための設定。
// iPhoneはマナーモード(消音スイッチ)がオンのときは、効果音も鳴らさない。
// Androidは、falseにすると音が鳴らなかったので、常に鳴らす。
// アプリ起動時に一度だけ呼び出せばよい。

import { setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";

export const configureAudioMode = async (): Promise<void> => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: Platform.OS === "android", // Androidではiphoneみたいに端末にカチッとやるボタンがないし、常にtrueでいい
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    console.log("🎧 audio mode configured");
  } catch (error) {
    console.warn("Failed to configure audio mode:", error);
  }
};
