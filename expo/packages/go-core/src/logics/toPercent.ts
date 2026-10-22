// 0.98943みたいなやつを99みたいな0~100の整数にする
export const toPercent = (raw: number) => {
  const percentage = raw * 100;
  const clamped = Math.max(0, Math.min(100, percentage));
  return Math.round(clamped);
};