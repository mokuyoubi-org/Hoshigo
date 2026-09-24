// records-repo-events.ts
// ====================================================================================
// 【ファイル全体の責務】
// records-repoへの書き込みが起きたことを、購読者(画面/フック)へ知らせるための
// シンプルな通知チャンネル。何が変わったかの粒度は分けず、
// 「何か変わったら全員に伝える。中身の取り直しは呼び出し側の責務」の一本で統一。
// ====================================================================================

type Listener = () => void;

// 🔔 records-repoへの書き込みを購読してるリスナー全員をここで管理
const listeners = new Set<Listener>();

/**
 * 🟩🟦使い方:
 * useEffect(() => {
 *   return subscribeToRecordsChange(() => {
 *     // 自分の画面が使ってるデータを再取得する
 *     refetch();
 *   });
 * }, []);
 * → recordsRepoのどれかの書き込み(insertMany/updateAnalysis/updateUsername/clearAll)が
 *   起きるたびに呼ばれる。何が変わったかは渡さないので、呼ばれたら
 *   「とりあえず自分の分は取り直す」というシンプルな戦略で使う想定。
 */
export function subscribeToRecordsChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 🔔 書き込みが起きたことを全購読者に伝える
export function notifyRecordsChange() {
  listeners.forEach((listener) => listener());
}