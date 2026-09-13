// src/stable/logics/syncUtils.ts
import { sqliteKv } from "@/src/stable/services/storage/sqlite";

/**
 * 🐱 指定した期間（分）に1回だけデータを取得し、それ以外はローカルキャッシュを返す関数！（ランキング用）
 * @param key キャッシュのユニークキー（例: "global_rankings"）
 * @param periodMinutes キャッシュを有効とみなす期間（分）（例: 1日なら1440）
 * @param fetcher サーバーからデータを取ってくる関数
 */
export async function fetchWithPeriodicCache<T>(
  key: string,
  periodMinutes: number,
  fetcher: () => Promise<T>,
): Promise<T | null> {
  const lastSyncKey = `last_sync_at_${key}`;
  const dataCacheKey = `cached_data_${key}`;
  const now = Date.now();

  const lastSyncAtStr = await sqliteKv.getItem(lastSyncKey);
  const lastSyncAt = lastSyncAtStr !== null ? Number(lastSyncAtStr) : null;
  const cachedDataStr = await sqliteKv.getItem(dataCacheKey);

  // 1. 期間内 ＆ キャッシュが存在する場合はローカルから即返却！
  if (
    lastSyncAt !== null &&
    now - lastSyncAt < periodMinutes * 60_000 &&
    cachedDataStr !== null
  ) {
    console.log(`[${key}] 期間内キャッシュから爆速で読み込んだ`);
    try {
      return JSON.parse(cachedDataStr) as T;
    } catch (e) {
      console.error(`[${key}] キャッシュのパースに失敗した:`, e);
    }
  }

  // 2. 期間切れ（またはキャッシュがない）場合はサーバーへ取りに行く！
  try {
    const newData = await fetcher();

    // 取得成功したらローカルに保存！
    await sqliteKv.setItem(dataCacheKey, JSON.stringify(newData));
    await sqliteKv.setItem(lastSyncKey, String(now));
    console.log(
      `[${key}] サーバーから新しく取ってきてキャッシュしたよ:`,
      new Date(now).toISOString(),
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


/**
 * 指定したキーのキャッシュと最終更新時間を削除する関数
 * @param key キャッシュのユニークキー（例: "global_rankings"）
 */
export async function clearPeriodicCache(key: string): Promise<void> {
  const lastSyncKey = `last_sync_at_${key}`;
  const dataCacheKey = `cached_data_${key}`;

  try {
    await sqliteKv.removeItem(lastSyncKey);
    await sqliteKv.removeItem(dataCacheKey);
    console.log(`[${key}] キャッシュを綺麗に消したよ！`);
  } catch (e) {
    console.error(`[${key}] キャッシュの削除に失敗したよ:`, e);
  }
}