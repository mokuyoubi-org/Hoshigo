import { TranslationKey } from "./translationTypes";

export type Group = {
  nameKey: TranslationKey; // stringからGroupKeyに変更
  color: string;
  minPoints: number;
};

export type ProgressInfo = {
  pointsNeeded: number;
  progressPercent: number;
  nextGroupName: string | null;
};
