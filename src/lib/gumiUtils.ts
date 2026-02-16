// src/lib/gumiutils.ts
import i18n from "../services/i18n";

export interface GumiInfo {
  nameKey: string; // 翻訳キーを保存
  color: string;
  minPoints: number;
}

// 白、黄色、緑、青、オレンジ、赤、
export const GUMI_DATA: GumiInfo[] = [
  { nameKey: "Gumi.shirogumi", color: "shirogumi", minPoints: 0 },
  { nameKey: "Gumi.momogumi", color: "momogumi", minPoints: 10 },
  { nameKey: "Gumi.orangegumi", color: "orangegumi", minPoints: 30 },
  { nameKey: "Gumi.kiirogumi", color: "kiirogumi", minPoints: 60 },
  { nameKey: "Gumi.midorigumi", color: "midorigumi", minPoints: 100 },
  { nameKey: "Gumi.aogumi", color: "aogumi", minPoints: 150 },
  { nameKey: "Gumi.soragumi1", color: "soragumi", minPoints: 210 },
  { nameKey: "Gumi.soragumi2", color: "soragumi", minPoints: 280 },
  { nameKey: "Gumi.nijigumi1", color: "nijigumi", minPoints: 360 },
  { nameKey: "Gumi.nijigumi2", color: "nijigumi", minPoints: 450 },
  { nameKey: "Gumi.tsukigumi1", color: "tsukigumi", minPoints: 550 },
  { nameKey: "Gumi.tsukigumi2", color: "tsukigumi", minPoints: 660 },
  { nameKey: "Gumi.tsukigumi3", color: "tsukigumi", minPoints: 780 },
  { nameKey: "Gumi.hoshigumi1", color: "hoshigumi", minPoints: 910 },
  { nameKey: "Gumi.hoshigumi2", color: "hoshigumi", minPoints: 1050 },
  { nameKey: "Gumi.hoshigumi3", color: "hoshigumi", minPoints: 1200 },
  { nameKey: "Gumi.hoshigumi4", color: "hoshigumi", minPoints: 1360 },
  {
    nameKey: "Gumi.hoshigumi5",
    color: "hoshigumi",
    minPoints: 1530,
  },
];

/**
 * index からぐみ情報を取得する
 * 範囲外の場合は最低ランク（0）を返す安全装置つき
 * nameは現在の言語で翻訳された名前を返す
 */
export function getGumiByIndex(index: number): GumiInfo & { name: string } {
  if (index < 0 || index >= GUMI_DATA.length) {
    const gumi = GUMI_DATA[0];
    return {
      ...gumi,
      name: i18n.t(gumi.nameKey),
    };
  }
  const gumi = GUMI_DATA[index];
  return {
    ...gumi,
    name: i18n.t(gumi.nameKey),
  };
}

export function getGumiByPoints(
  points: number,
  currentGumiIndex: number,
): number {
  for (let i = GUMI_DATA.length - 1; i > currentGumiIndex; i--) {
    if (points >= GUMI_DATA[i].minPoints) {
      return i;
    }
  }
  return currentGumiIndex;
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
): ProgressInfo {
  const currentGumi = GUMI_DATA[currentGumiIndex];
  const nextGumi = GUMI_DATA[currentGumiIndex + 1];

  // 最上位ランクの場合は常に満タン
  if (!nextGumi) {
    console.log("nextGumiがない");
    return {
      pointsNeeded: 0,
      progressPercent: 100,
      nextGumiName: null,
    };
  }
  console.log("nextGumi: ", nextGumi);

  // 次のぐみまでに必要なレート
  const pointsNeeded = nextGumi.minPoints - currentPoints;

  let progressPercent: number;
  progressPercent = (currentPoints / nextGumi.minPoints) * 100;

  return {
    pointsNeeded: Math.max(0, pointsNeeded),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    nextGumiName: i18n.t(nextGumi.nameKey), // 翻訳された名前を返す
  };
}

const thresholds = [
  0, 10, 30, 60, 100, 150, 210, 280, 360, 450, 550, 660, 780, 910, 1050, 1200,
  1360, 1530,
] as const;

export const pointsToGumiIndex = (value: number): number =>
  Math.max(
    0,
    thresholds.findLastIndex((t) => value >= t),
  );

// 自分の今のレートとぐみを渡すと次のぐみまであとなんポイントか返してくれる関数
export const howManyPointsLeft = (
  playerPoints: number,
  playerGumiIndex: number,
) => {
  return GUMI_DATA[playerGumiIndex + 1].minPoints - playerPoints;
};
