import { useSoundPlayer } from "sound-kit";
import { getSoundUrl } from "../constants/r2"; // 作成したR2用ヘルパー

export type SoundName = "gamestart" | "pip";

export const useSounds = () => {
  return useSoundPlayer<SoundName>({
    gamestart: getSoundUrl("gamestart.mp3"),
    pip: getSoundUrl("pip.mp3"),
  });
};