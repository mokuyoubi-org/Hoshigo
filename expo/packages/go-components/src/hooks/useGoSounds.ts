import { useSoundPlayer } from "sound-kit";

export type SoundName = "stone" | "pass";

export const useSounds = () => {
  return useSoundPlayer<SoundName>({
    stone: require("../../assets/sounds/stone.mp3"),
    pass: require("../../assets/sounds/pass.mp3"),
  });
};