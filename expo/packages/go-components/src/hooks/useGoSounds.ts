import { useSoundPlayer } from "sound-kit";
import { getSoundUrl } from "../constants/r2"; // 作成したR2用ヘルパー

export type SoundName = "stone" | "pass";

export const useSounds = () => {
  return useSoundPlayer<SoundName>({
    stone: getSoundUrl("stone.mp3"),
    pass: getSoundUrl("pass.mp3"),
  });
};