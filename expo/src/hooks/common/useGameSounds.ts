// src/hooks/useGameSounds.ts

import { SOUNDS } from "@/src/constants/sounds";
import { useSoundPlayer } from "assets-kit";

export const useGameSounds = () =>
  useSoundPlayer({
    gamestart: SOUNDS.gamestart,
    pip: SOUNDS.pip,
  });