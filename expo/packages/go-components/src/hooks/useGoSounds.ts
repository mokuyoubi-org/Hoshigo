// src/hooks/useGameSounds.ts

import { useSoundPlayer } from "assets-kit";
import { SOUNDS } from "../constants/sounds";

export const useGoSounds = () =>
  useSoundPlayer({
    stone: SOUNDS.stone,
    pass: SOUNDS.pass,
  });
