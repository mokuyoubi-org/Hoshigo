// api.ts
//
// 自分たちのサーバー(Cloudflareの hoshigo-api)と、通信するための電話機☎️
//  1. エラーの code(MAINTENANCE_MODE など)を検知して、アプリに知らせる
//  2. 通信自体の失敗(codeなし)だけ、自動で再送する(最大3回、指数バックオフ)
//  3. アプリのバージョンを、全リクエストのヘッダーに付ける

import { OTA_VERSION } from "@/ota-version";
import { UpdateReason } from "@/src/contexts/AppContexts";
import { authClient } from "@/src/services/auth/auth-client";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

// メンテナンス系
// ここでcontextを更新しているわけではない(AuthGateが、あらかじめ仕込む)
let onMaintenanceTriggered: ((message: string | null) => void) | null = null;
export const setMaintenanceHandler = (h: typeof onMaintenanceTriggered) => {
  onMaintenanceTriggered = h;
};

// バージョン不足系(上と同じ形)
let onUpdateNeededTriggered: ((reason: UpdateReason) => void) | null = null;
export const setUpdateNeededHandler = (h: typeof onUpdateNeededTriggered) => {
  onUpdateNeededTriggered = h;
};

// webにはnativeApplicationVersionが存在しないので、その場合はビルド時に
// 埋め込まれたexpoConfigVersion(常にnativeApplicationVersionと一緒に更新される値)で代用する。
export const appVersion =
  Platform.OS === "web"
    ? (Constants.expoConfig?.version ?? "unknown")
    : (Application.nativeApplicationVersion ?? "unknown");

const API_URL = process.env.EXPO_PUBLIC_API_URL!; // サーバーの場所
const MAX_RETRIES = 3; // 再送の最大回数(初回を除く)
const RETRY_BASE_DELAY_MS = 500; // 再送の待ち時間のもと(指数バックオフ)

export type ApiError = {
  /** サーバーが返したエラーのcode。無ければ、サーバーまで届かなかった通信の失敗 */
  code?: string;
  message: string;
  status?: number;
};

// 成功なら data、失敗なら error
export type ApiResult<T> = { data: T | null; error: ApiError | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 再送してよい失敗か。
// codeが付いている = サーバーまで届いて、意味のある応答が返ってきた「論理エラー」→ 再送しない。
// codeがない = 通信自体の失敗(圏外、タイムアウトなど)、またはサーバーの一時的な5xx → 再送する。
const isRetryableError = (error: ApiError): boolean => {
  if (error.code) return false;
  return error.status === undefined || error.status >= 500;
};

// メンテナンス・バージョン不足を検知して、アプリに知らせる
export const notifyIfSpecialError = (error: ApiError) => {
  switch (error.code) {
    case "MAINTENANCE_MODE":
      onMaintenanceTriggered?.(error.message);
      break;
    case "VERSION_INSUFFICIENT_APP":
      onUpdateNeededTriggered?.("app");
      break;
    case "VERSION_INSUFFICIENT_OTA":
      onUpdateNeededTriggered?.("ota");
      break;
  }
};

// 1回分の呼び出し
const callOnce = async <T>(
  name: string,
  args: Record<string, unknown>,
): Promise<ApiResult<T>> => {
  try {
    // スマホ(金庫あり)のときだけ、cookieを手で取り出す。
    // Webでは、ブラウザが自動で持ち歩く(credentials: "include")ので、不要。
    const cookie = Platform.OS === "web" ? "" : await authClient.getCookie();

    const res = await fetch(`${API_URL}/rpc/${name}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-app-version": appVersion,
        "x-ota-version": OTA_VERSION,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(args),
    });

    const body = await res.json().catch(() => null);
    if (res.ok) return { data: body as T, error: null };

    const e = body?.error;
    return {
      data: null,
      error: {
        code: e?.code,
        message: e?.message ?? `HTTP ${res.status}`,
        status: res.status,
      },
    };
  } catch (e) {
    // 通信自体の失敗(codeなし)
    return { data: null, error: { message: String(e) } };
  }
};

export const api = {
  // ここをアロー関数に変える
  rpc: async <T = any>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<ApiResult<T>> => {
    let result: ApiResult<T> = { data: null, error: { message: "unknown" } };
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      result = await callOnce<T>(name, args);
      if (!result.error || !isRetryableError(result.error)) break;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
    if (result.error) notifyIfSpecialError(result.error);
    return result;
  },
};
