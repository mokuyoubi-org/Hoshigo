import { storage } from "@/src/stable/services/storage/secure"; // これはまだ居残り(要ts-utils化取りやめ相当の判断)
import {
  createResilientClient,
  parseAuthTokensFromUrl,
} from "supabase-toolkit";

let onMaintenanceTriggered: ((message: string | null) => void) | null = null;
export const setMaintenanceHandler = (h: typeof onMaintenanceTriggered) => {
  onMaintenanceTriggered = h;
};

export const supabase = createResilientClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  storage,
  onErrorMarkerDetected: (msg) => onMaintenanceTriggered?.(msg),
});

export const handleAuthCallback = async (url: string) => {
  try {
    const { access_token, refresh_token } = parseAuthTokensFromUrl(url);
    if (access_token && refresh_token)
      return await supabase.auth.setSession({ access_token, refresh_token });
    return {
      data: null,
      error: new Error(
        "URLの中にログイン用チケット(トークン)が見つかりませんでした",
      ),
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
};
