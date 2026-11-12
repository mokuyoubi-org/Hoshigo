// drizzle.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/hoshigo/*-schema.ts", // appSchemaとauthSchemaの2種類
  out: "./migrations",
});
