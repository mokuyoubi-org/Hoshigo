// guard.ts

import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../auth";
import * as appSchema from "../db/app-schema";

export type GateError = {
  status: 426 | 503;
  code: string;
  message: string;
};

// ①アプリのバージョン ②OTAのバージョン ③メンテナンス中か、をこの順番で確認する。
// 引っかかったら、エラーの中身を返す。通れるなら null。
export async function checkGate(
  env: AuthEnv,
  clientAppVersion: string | null | undefined,
  clientOtaVersion: string | null | undefined,
): Promise<GateError | null> {
  const db = drizzle(env.DB, { schema: appSchema });
  const [status] = await db.select().from(appSchema.appStatus).limit(1);
  if (!status) return null;

  // app_version が設定されていて、完全一致していなければ、強制アップデート
  if (status.appVersion !== null && clientAppVersion !== status.appVersion) {
    return {
      status: 426,
      code: "VERSION_INSUFFICIENT_APP",
      message: status.appVersion,
    };
  }

  // ota_version が設定されていて、完全一致していなければ、再起動
  if (status.otaVersion !== null && clientOtaVersion !== status.otaVersion) {
    return {
      status: 426,
      code: "VERSION_INSUFFICIENT_OTA",
      message: status.otaVersion,
    };
  }

  // メンテナンス中
  if (status.maintenance) {
    return {
      status: 503,
      code: "MAINTENANCE_MODE",
      message: status.message || "現在メンテナンス中です",
    };
  }

  return null;
}

// /rpc/ 以下の全部の入り口に立つ「見張り番」。ヘッダーでバージョンを受け取る。
export const guard = createMiddleware<{ Bindings: AuthEnv }>(
  async (c, next) => {
    const error = await checkGate(
      c.env,
      c.req.header("x-app-version"),
      c.req.header("x-ota-version"),
    );
    if (error) {
      return c.json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    }
    await next();
  },
);
