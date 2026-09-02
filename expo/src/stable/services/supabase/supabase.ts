// コメント2026/08/31
// supabase.ts

import { storage } from "@/src/stable/services/storage/secure";
import { createResilientClient } from "supabase-toolkit";

// メンテナンス系
// ここでcontextを更新しているわけではないみたい
let onMaintenanceTriggered: ((message: string | null) => void) | null = null;
export const setMaintenanceHandler = (h: typeof onMaintenanceTriggered) => {
  onMaintenanceTriggered = h;
};

// 「supabase」はsupabaseのサーバと通信するための電話機☎️
// Resilientはしなやかで折れない、すぐに元に戻るという意味
export const supabase = createResilientClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!, // サーバの場所
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, // サーバの鍵
  storage, // ローカルに用意する金庫(アクセストークンや、リフレッシュトークン)
  onErrorMarkerDetected: (msg) => onMaintenanceTriggered?.(msg), //
});
