import { useSoundPlayer } from "sound-kit";

export type SoundName = "gamestart" | "pip";

export const useSounds = () => {
  return useSoundPlayer<SoundName>({
    gamestart: require("../../../assets/sounds/gamestart.mp3"),
    pip: require("../../../assets/sounds/pip.mp3"),
  });
};