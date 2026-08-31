// records-repo.native.ts

import type { RecordType } from "@/src/active/types/record";
import type { RecordAnalysis } from "@/src/active/types/analysis";
import * as SQLite from "expo-sqlite";

export type RecordsRepo = {
  insertMany: (records: RecordType[]) => Promise<void>;
  getNewestId: (boardSize: number) => Promise<number | null>;
  getOldestId: (boardSize: number) => Promise<number | null>;
  getPage: (
    boardSize: number,
    beforeId: number | null,
    limit: number,
  ) => Promise<RecordType[]>;
  updateAnalysis: (
    boardSize: number,
    id: number,
    analysis: RecordAnalysis | null,
  ) => Promise<void>; // 🆕追加
  clearAll: () => Promise<void>; // 🆕追加
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("hoshigo-records.db").then(
      async (db) => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY,
            result TEXT,
            created_at TEXT NOT NULL,
            black_uid TEXT,
            white_uid TEXT,
            moves TEXT,
            match_type INTEGER,
            black_points INTEGER,
            white_points INTEGER,
            board_size INTEGER NOT NULL,
            dead_stones TEXT NOT NULL,
            black_username TEXT,
            black_icon_index INTEGER,
            black_rank_index INTEGER,
            white_username TEXT,
            white_icon_index INTEGER,
            white_rank_index INTEGER,
            analysis TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_records_board_id
            ON records (board_size, id);
        `);
        // 🆕既存インストール向けマイグレーション。
        // CREATE TABLE IF NOT EXISTSは既存テーブルにカラムを追加してくれないので、
        // 新規インストールでは重複エラーになるのを承知でALTER TABLEも試す。
        try {
          await db.execAsync(`ALTER TABLE records ADD COLUMN analysis TEXT`);
        } catch {
          // 既にカラムがある場合はここに来る(想定内なので握りつぶす)
        }
        return db;
      },
    );
  }
  return dbPromise;
}

function rowToRecord(row: any): RecordType {
  return {
    ...row,
    moves: row.moves ? JSON.parse(row.moves) : null,
    dead_stones: row.dead_stones ? JSON.parse(row.dead_stones) : [],
    analysis: row.analysis ? JSON.parse(row.analysis) : null, // 🆕追加
  };
}

export const recordsRepo: RecordsRepo = {
  insertMany: async (records) => {
    // (変更なし。analysisはINSERT文の列に含めていないので新規行は自動的にNULLになる)
    if (records.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      const stmt = await db.prepareAsync(`
        INSERT OR IGNORE INTO records (
          id, result, created_at, black_uid, white_uid, moves, match_type,
          black_points, white_points, board_size, dead_stones,
          black_username, black_icon_index, black_rank_index,
          white_username, white_icon_index, white_rank_index
        ) VALUES ($id, $result, $created_at, $black_uid, $white_uid, $moves, $match_type,
          $black_points, $white_points, $board_size, $dead_stones,
          $black_username, $black_icon_index, $black_rank_index,
          $white_username, $white_icon_index, $white_rank_index)
      `);
      try {
        for (const r of records) {
          await stmt.executeAsync({
            $id: r.id,
            $result: r.result,
            $created_at: r.created_at,
            $black_uid: r.black_uid,
            $white_uid: r.white_uid,
            $moves: r.moves ? JSON.stringify(r.moves) : null,
            $match_type: r.match_type,
            $black_points: r.black_points,
            $white_points: r.white_points,
            $board_size: r.board_size,
            $dead_stones: JSON.stringify(r.dead_stones ?? []),
            $black_username: r.black_username,
            $black_icon_index: r.black_icon_index,
            $black_rank_index: r.black_rank_index,
            $white_username: r.white_username,
            $white_icon_index: r.white_icon_index,
            $white_rank_index: r.white_rank_index,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    });
  },

  getNewestId: async (boardSize) => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ maxId: number | null }>(
      `SELECT MAX(id) as maxId FROM records WHERE board_size = ?`,
      [boardSize],
    );
    return row?.maxId ?? null;
  },

  getOldestId: async (boardSize) => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ minId: number | null }>(
      `SELECT MIN(id) as minId FROM records WHERE board_size = ?`,
      [boardSize],
    );
    return row?.minId ?? null;
  },

  getPage: async (boardSize, beforeId, limit) => {
    const db = await getDb();
    const rows =
      beforeId == null
        ? await db.getAllAsync(
            `SELECT * FROM records WHERE board_size = ? ORDER BY id DESC LIMIT ?`,
            [boardSize, limit],
          )
        : await db.getAllAsync(
            `SELECT * FROM records WHERE board_size = ? AND id < ? ORDER BY id DESC LIMIT ?`,
            [boardSize, beforeId, limit],
          );
    return rows.map(rowToRecord);
  },

  // 🆕1手分析されるごとにここが呼ばれる想定。analysis列を丸ごと上書き。
  updateAnalysis: async (boardSize, id, analysis) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE records SET analysis = ? WHERE board_size = ? AND id = ?`,
      [analysis ? JSON.stringify(analysis) : null, boardSize, id],
    );
  },

  clearAll: async () => {
    const db = await getDb();
    await db.execAsync(`DELETE FROM records;`);
  },
};