// constants/r2.ts

export const R2_BASE_URL = "https://pub-12902bc74d0947ba93c153e18ffbcf88.r2.dev";

// 画像のURLを作る関数
export const getImageUrl = (filename: string) => `${R2_BASE_URL}/images/${filename}`;

// 音声のURLを作る関数
export const getSoundUrl = (filename: string) => `${R2_BASE_URL}/sounds/${filename}`;