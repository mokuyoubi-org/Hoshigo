// useGameSounds.ts

import { getSoundUrl, useSoundPlayer } from "sound-kit";

export type SoundName = "gamestart" | "pip";

export const useSounds = () => {
  return useSoundPlayer<SoundName>({
    gamestart: getSoundUrl("gamestart.mp3"),
    pip: getSoundUrl("pip.mp3"),
  });
};
