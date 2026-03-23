import { useTranslation } from "../contexts/LocaleContexts";
import { TranslationKey } from "../services/translations";

export interface GumiInfo {
  nameKey: TranslationKey; // stringからGumiKeyに変更
  color: string;
  minPoints: number;
}

// 白、黄色、緑、青、オレンジ、赤、
export const GUMI_DATA: GumiInfo[] = [
  { nameKey: "Gumi.shirogumi", color: "shirogumi", minPoints: 0 }, // 0
  { nameKey: "Gumi.momogumi", color: "momogumi", minPoints: 20 }, // 1
  { nameKey: "Gumi.orangegumi", color: "orangegumi", minPoints: 60 }, // 2
  { nameKey: "Gumi.kiirogumi", color: "kiirogumi", minPoints: 120 }, // 3
  { nameKey: "Gumi.midorigumi", color: "midorigumi", minPoints: 200 }, // 4
  { nameKey: "Gumi.aogumi", color: "aogumi", minPoints: 300 }, // 5
  { nameKey: "Gumi.soragumi1", color: "soragumi", minPoints: 420 }, // 6
  { nameKey: "Gumi.soragumi2", color: "soragumi", minPoints: 560 }, // 7
  { nameKey: "Gumi.soragumi3", color: "soragumi", minPoints: 720 }, // 8
  { nameKey: "Gumi.nijigumi1", color: "nijigumi", minPoints: 900 }, // 9
  { nameKey: "Gumi.nijigumi2", color: "nijigumi", minPoints: 1100 }, // 10
  { nameKey: "Gumi.nijigumi3", color: "nijigumi", minPoints: 1300 }, // 11
  { nameKey: "Gumi.tsukigumi1", color: "tsukigumi", minPoints: 1500 }, // 12
  { nameKey: "Gumi.tsukigumi2", color: "tsukigumi", minPoints: 1700 }, // 13
  { nameKey: "Gumi.tsukigumi3", color: "tsukigumi", minPoints: 1900 }, // 14
  { nameKey: "Gumi.hoshigumi1", color: "hoshigumi", minPoints: 2100 }, // 15
  { nameKey: "Gumi.hoshigumi2", color: "hoshigumi", minPoints: 2300 }, // 16
  {
    nameKey: "Gumi.hoshigumi3",
    color: "hoshigumi",
    minPoints: 2500,
  }, // 17
];

/**
 * index からぐみ情報を取得する
 * 範囲外の場合は最低ランク（0）を返す安全装置つき
 * nameは現在の言語で翻訳された名前を返す
 */
export function getGumiByIndex(index: number): GumiInfo & { name: string } {
  const { t } = useTranslation();
  if (index < 0 || index >= GUMI_DATA.length) {
    const gumi = GUMI_DATA[0];
    return {
      ...gumi,
      name: t(gumi.nameKey),
    };
  }
  const gumi = GUMI_DATA[index];
  return {
    ...gumi,
    name: t(gumi.nameKey),
  };
}

export interface ProgressInfo {
  pointsNeeded: number;
  progressPercent: number;
  nextGumiName: string | null;
}

// プレイヤの
// 1. ポイント と
// 2. ぐみindex
// を受け取ったら、
// 1. 次のぐみへの昇格に必要なポイント
// 2. 今のパーセント。今が5で次が10なら50%。
// 3. つぎのぐみの名前
// を返す。
export function calculateGumiProgress(
  currentPoints: number,
  currentGumiIndex: number,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): ProgressInfo {
  // useTranslation() を削除
  const nextGumi = GUMI_DATA[currentGumiIndex + 1];
  const currentGumi = GUMI_DATA[currentGumiIndex];

  if (!nextGumi) {
    return {
      pointsNeeded: 0,
      progressPercent: 100,
      nextGumiName: null,
    };
  }

  const pointsNeeded = nextGumi.minPoints - currentPoints;
  const progressPercent =
    ((currentPoints - currentGumi.minPoints) /
      (nextGumi.minPoints - currentGumi.minPoints)) *
    100;

  return {
    pointsNeeded: Math.max(0, pointsNeeded),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    nextGumiName: t(nextGumi.nameKey),
  };
}
