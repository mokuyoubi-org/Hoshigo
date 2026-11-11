// drizzle.tsumego.config.ts
// 詰碁だけを入れる別のDB(TSUMEGO_DB)用の設定。
// メインの drizzle.config.ts とは、別の系統で動かす。
// 使い方: npx drizzle-kit generate --config=drizzle.tsumego.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/tsumego/schema.ts",
  out: "./migrations-tsumego",
});