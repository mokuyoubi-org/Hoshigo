// drizzle.records.config.ts
// 棋譜だけを入れる別のDB(RECORDS_DB)用の設定。
// メインの drizzle.config.ts とは、別の系統で動かす。
// 使い方: npx drizzle-kit generate --config=drizzle.records.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/records/schema.ts",
  out: "./migrations-records",
});