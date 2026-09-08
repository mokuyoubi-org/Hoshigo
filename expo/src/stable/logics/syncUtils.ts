// src/stable/logics/syncUtils.ts
import { sqliteKv } from "@/src/stable/services/storage/sqlite";

/**
 * 🐱 1日1回だけ実行する処理を包むためのマジック関数！（syncNewer用）
 * @param key 保存用のユニークなキー（例: "records_9"）
 * @param task 今日まだ実行されていなければ走らせたい非同期処理
 */
export async function runOncePerDay(
  key: string,
  task: () => Promise<void>,
): Promise<void> {
  const todayStr = new Date().toISOString().split("T")[0];
  const lastSyncKey = `last_sync_date_${key}`;

  // 1. 今日すでに実行したかチェック
  const lastSyncDate = await sqliteKv.getItem(lastSyncKey);
  if (lastSyncDate === todayStr) {
    console.log(`[${key}] 今日はすでに実行済みだからスキップする`);
    return;
  }

  // 2. タスクを実行する
  await task();

  // 3. 成功したら今日の日付を保存
  await sqliteKv.setItem(lastSyncKey, todayStr);
  console.log(`[${key}] 本日の実行完了日を記録したよ:`, todayStr);
}

/**
 * 🐱 1日1回だけデータを取得し、2回目以降はローカルキャッシュを返す関数！（ランキング用）
 * @param key キャッシュのユニークキー（例: "global_rankings"）
 * @param fetcher サーバーからデータを取ってくる関数
 */
export async function fetchWithDailyCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T | null> {
  const todayStr = new Date().toISOString().split("T")[0];
  const lastSyncKey = `last_sync_date_${key}`;
  const dataCacheKey = `cached_data_${key}`;

  const lastSyncDate = await sqliteKv.getItem(lastSyncKey);
  const cachedDataStr = await sqliteKv.getItem(dataCacheKey);

  // 1. 今日すでに取得済み ＆ キャッシュが存在する場合はローカルから即返却！
  if (lastSyncDate === todayStr && cachedDataStr !== null) {
    console.log(`[${key}] 今日のキャッシュから爆速で読み込んだ`);
    try {
      return JSON.parse(cachedDataStr) as T;
    } catch (e) {
      console.error(`[${key}] キャッシュのパースに失敗した:`, e);
    }
  }

  // 2. まだ今日取ってない（またはキャッシュがない）場合はサーバーへ取りに行く！
  try {
    const newData = await fetcher();

    // 取得成功したらローカルに保存！
    await sqliteKv.setItem(dataCacheKey, JSON.stringify(newData));
    await sqliteKv.setItem(lastSyncKey, todayStr);
    console.log(
      `[${key}] サーバーから新しく取ってきてキャッシュしたよ:`,
      todayStr,
    );

    return newData;
  } catch (e) {
    console.error(`[${key}] データ取得に失敗:`, e);
    if (cachedDataStr !== null) {
      return JSON.parse(cachedDataStr) as T;
    }
    return null;
  }
}
