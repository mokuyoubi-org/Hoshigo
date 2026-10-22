// expo/src/logics/ai/kataGoQueue.ts
//
// ─── この係の責務 ─────────────────────────────────────
// KataGoへの解析依頼の「順番待ちの列」を、アプリ全体で1つだけ持つ。
// 前の1件の結果が返ってくるまで次は送らず、返ってきたらFIFO(先着順)で
// 次を送る。列の全消し(clearKataGoQueue)だけできる。
// Reactの外の普通のモジュールなので、どのhookから使っても列は1つ。
// ──────────────────────────────────────────────────

type Job = {
  start: () => Promise<unknown>;
  resolve: (result: unknown) => void;
};

const queue: Job[] = [];
let isRunning = false;

const processNext = async (): Promise<void> => {
  if (isRunning) return;
  const job = queue.shift();
  if (!job) return;
  isRunning = true;
  try {
    job.resolve(await job.start());
  } catch (e) {
    console.error("[kataGoQueue] 実行エラー:", e);
    job.resolve(null);
  } finally {
    isRunning = false;
    processNext();
  }
};

// 依頼を列に並べる。自分の番が来て、結果が返ってきたら resolve される。
export const enqueueKataGo = <T>(start: () => Promise<T>): Promise<T | null> => {
  return new Promise((resolve) => {
    queue.push({
      start,
      resolve: resolve as (result: unknown) => void,
    });
    processNext();
  });
};

// 列に並んでいる(まだ始まっていない)依頼を全部消す。消した分は null で終わる。
// 今まさに実行中の1件は止められない(結果は返ってくる)。
export const clearKataGoQueue = (): number => {
  const removed = queue.splice(0, queue.length);
  removed.forEach((job) => job.resolve(null));
  return removed.length;
};