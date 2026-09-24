// assets-kit/src/r2.ts

const R2_ASSETS_BASE_URL = "https://assets.hoshigo.app";

export const getImageUrl = (filename: string) =>
  `${R2_ASSETS_BASE_URL}/images/${filename}`;

// 音声のURLを作る関数
export const getSoundUrl = (filename: string) =>
  `${R2_ASSETS_BASE_URL}/sounds/${filename}`;
