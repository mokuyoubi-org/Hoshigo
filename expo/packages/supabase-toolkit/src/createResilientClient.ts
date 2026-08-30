// createResilientClient.ts
//
// 通常のSupabaseクライアントに2つの上乗せをする:
//  1. rpc()の結果を横取りして、特定のエラー文字列(デフォルトは"MAINTENANCE_MODE")が
//     含まれていたら、登録済みのコールバックへ通知する
//  2. URL(認証コールバック)からaccess_token/refresh_tokenを取り出すヘルパー
//
// どのURL/anonKey/エラーマーカー文字列を使うかは、呼び出し元がすべて引数で渡す。
// このファイル自体はどのSupabaseプロジェクトかを一切知らない。

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

export type CreateResilientClientArgs = {
  url: string;
  anonKey: string;
  storage: StorageAdapter;
  /** このエラーメッセージが含まれていたら onErrorMarkerDetected を呼ぶ。デフォルト "MAINTENANCE_MODE" */
  errorMarker?: string;
  onErrorMarkerDetected?: (extractedMessage: string) => void;
};

export function createResilientClient({
  url,
  anonKey,
  storage,
  errorMarker = "MAINTENANCE_MODE",
  onErrorMarkerDetected,
}: CreateResilientClientArgs): SupabaseClient {
  const raw = createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  });

  const checkError = (error: { message: string } | null) => {
    if (error && error.message.includes(errorMarker)) {
      const extracted = error.message
        .replace(new RegExp(`.*${errorMarker}:\\s*`), "")
        .trim();
      onErrorMarkerDetected?.(extracted);
    }
  };

  return new Proxy(raw, {
    get(target, prop, receiver) {
      if (prop === "rpc") {
        return (...args: Parameters<typeof raw.rpc>) => {
          const builder = Reflect.get(target, prop, receiver).apply(
            target,
            args,
          );
          const originalThen = builder.then.bind(builder);
          builder.then = (onfulfilled?: any, onrejected?: any) =>
            originalThen((res: any) => {
              if (res && res.error) checkError(res.error);
              return onfulfilled ? onfulfilled(res) : res;
            }, onrejected);
          return builder;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}

export function parseAuthTokensFromUrl(url: string) {
  const cleanUrl = url.replace("#", "?");
  const urlObj = new URL(cleanUrl);

  return {
    access_token: urlObj.searchParams.get("access_token"),
    refresh_token: urlObj.searchParams.get("refresh_token"),
  };
}