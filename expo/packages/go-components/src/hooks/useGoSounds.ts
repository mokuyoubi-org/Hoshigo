// useGoSounds.ts

import { getSoundUrl, useSoundPlayer } from "sound-kit";

export type SoundName = "stone" | "pass";

export const useSounds = () => {
  return useSoundPlayer<SoundName>({
    stone: getSoundUrl("stone.mp3"),
    pass: getSoundUrl("pass.mp3"),
  });
};
