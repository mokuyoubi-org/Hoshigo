// drizzle.records.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/records/schema.ts",
  out: "./migrations-records",
});