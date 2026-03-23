import { TranslationKey } from "../services/translations";

// プロフィール登録関連
export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password: string) => {
  return password.length >= 6;
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const pointsToWins = (points: number): number => {
  return Math.ceil(points / 10);
};

export const wrapBotDisplayname = (
  displayname: string,
  t: (key: TranslationKey, params?: any) => string,
) => {
  const botKeys = ["bot1", "bot2", "bot3", "bot4", "bot5"];
  if (botKeys.includes(displayname)) {
    return t(`BotsName.${displayname}displayname` as TranslationKey);
  }
  return displayname;
};


export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;