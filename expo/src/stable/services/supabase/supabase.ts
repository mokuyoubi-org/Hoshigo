// コメント2026/09/13
// supabase.ts

import { OTA_VERSION } from "@/ota-version";
import type { UpdateReason } from "@/src/active/contexts/AppContexts";
import { storage } from "@/src/stable/services/storage/secure";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { createResilientClient } from "supabase-kit";

// メンテナンス系
// ここでcontextを更新しているわけではないみたい
let onMaintenanceTriggered: ((message: string | null) => void) | null = null;
export const setMaintenanceHandler = (h: typeof onMaintenanceTriggered) => {
  onMaintenanceTriggered = h;
};

// バージョン不足系
// ここでcontextを更新しているわけではないみたい(上と同じ形)
let onUpdateNeededTriggered: ((reason: UpdateReason) => void) | null = null;
export const setUpdateNeededHandler = (h: typeof onUpdateNeededTriggered) => {
  onUpdateNeededTriggered = h;
};

// webにはnativeApplicationVersionが存在しないので、その場合はビルド時に
// 埋め込まれたexpoConfigVersion(常にnativeApplicationVersionと一緒に更新される値)で代用する。
const appVersion =
  Platform.OS === "web"
    ? (Constants.expoConfig?.version ?? "unknown")
    : (Application.nativeApplicationVersion ?? "unknown");

// 「supabase」はsupabaseのサーバと通信するための電話機☎️
// Resilientはしなやかで折れない、すぐに元に戻るという意味
export const supabase = createResilientClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!, // サーバの場所
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, // サーバの鍵
  storage, // ローカルに用意する金庫(アクセストークンや、リフレッシュトークン)
  appVersion, // x-app-versionヘッダーとして全rpcに自動で乗る
  otaVersion: OTA_VERSION, // x-ota-versionヘッダーとして全rpcに自動で乗る
  errorMarkers: [
    {
      marker: "MAINTENANCE_MODE",
      onDetected: (msg) => onMaintenanceTriggered?.(msg),
    },
    {
      marker: "VERSION_INSUFFICIENT_APP",
      onDetected: () => onUpdateNeededTriggered?.("app"),
    },
    {
      marker: "VERSION_INSUFFICIENT_OTA",
      onDetected: () => onUpdateNeededTriggered?.("ota"),
    },
  ],
});
