// drizzle.tsumego.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/tsumego/schema.ts",
  out: "./migrations-tsumego",
});