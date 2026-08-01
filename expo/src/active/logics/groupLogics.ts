import { GROUPS } from "../constants/groups";
import { Group, ProgressInfo } from "../types/groupTypes";
import { TranslationKey } from "../types/translationTypes";

/**
 * index からぐみ情報を取得する
 * 範囲外の場合は最低ランク（0）を返す安全装置つき
 * nameは現在の言語で翻訳された名前を返す
 */
export function getGroupByIndex(
  index: number,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): Group & { name: string } {
  if (index < 0 || index >= GROUPS.length) {
    const group = GROUPS[0];
    return {
      ...group,
      name: t(group.nameKey),
    };
  }
  const group = GROUPS[index];
  return {
    ...group,
    name: t(group.nameKey),
  };
}

// プレイヤの
// 1. ポイント と
// 2. ぐみindex
// を受け取ったら、
// 1. 次のぐみへの昇格に必要なポイント
// 2. 今のパーセント。今が5で次が10なら50%。
// 3. つぎのぐみの名前
// を返す。
export function calculateGroupProgress(
  currentPoints: number,
  currentGroupIndex: number,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): ProgressInfo {
  // useTranslation() を削除
  const nextGroup = GROUPS[currentGroupIndex + 1];
  const currentGroup = GROUPS[currentGroupIndex];

  if (!nextGroup) {
    return {
      pointsNeeded: 0,
      progressPercent: 100,
      nextGroupName: null,
    };
  }

  const pointsNeeded = nextGroup.minPoints - currentPoints;
  const progressPercent =
    ((currentPoints - currentGroup.minPoints) /
      (nextGroup.minPoints - currentGroup.minPoints)) *
    100;

  return {
    pointsNeeded: Math.max(0, pointsNeeded),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    nextGroupName: t(nextGroup.nameKey),
  };
}
