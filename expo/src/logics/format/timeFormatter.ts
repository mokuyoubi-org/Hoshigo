// timeFormatter.ts

// 秒を分に変換。例えば、180を3:00に変換（マイナスは 0:00 表示にガードする）
export const secondsToMinutes = (totalSeconds: number): string => {
  // 🐱 マイナス（0未満）になったら強制的に 0 に補正する
  const safeSeconds = Math.max(0, totalSeconds);

  const minutes = Math.floor(safeSeconds / 60); // 分
  const seconds = safeSeconds % 60; // 残り秒
  const paddedSeconds = seconds.toString().padStart(2, "0"); // 0埋め
  return `${minutes}:${paddedSeconds}`;
};
