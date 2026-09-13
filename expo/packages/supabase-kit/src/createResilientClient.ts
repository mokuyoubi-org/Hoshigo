// createResilientClient.ts
//
// 通常のSupabaseクライアントに2つの上乗せをする:
//  1. rpc()の結果を横取りして、特定のエラー文字列(デフォルトは"MAINTENANCE_MODE")が
//     含まれていたら、登録済みのコールバックへ通知する
//  2. rpc()が失敗したとき、それが「論理エラー」(error.codeあり)でなければ
//     自動的に再送する(デフォルト最大3回、指数バックオフ)
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
  /** rpc()失敗時の最大リトライ回数(初回を除く)。デフォルト 3 */
  maxRetries?: number;
  /** リトライの基本待機時間(ms)。指数バックオフのベースになる。デフォルト 500 */
  retryBaseDelayMs?: number;
  /**
   * このエラーをリトライすべきかどうかを判定する関数。
   * デフォルトでは「error.codeが付いている(=DB/PostgRESTから明確な応答が返ってきた
   * 論理エラー)ならリトライしない、codeが無い(=fetch自体が失敗した予期しないエラー)
   * ならリトライする」というルールになっている。
   */
  isRetryableError?: (error: { code?: string; message: string }) => boolean;
};

function defaultIsRetryableError(error: {
  code?: string;
  message: string;
}): boolean {
  if (!error) return false;
  // codeが付いている = サーバーまで届いて、意味のある応答(RAISE EXCEPTION等)が
  // 返ってきたということ。これは再送すべきではない「論理エラー」。
  if (error.code) return false;
  // codeが無い = fetch自体が失敗した(タイムアウト、通信断など)予期しないエラー。
  return true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createResilientClient({
  url,
  anonKey,
  storage,
  errorMarker = "MAINTENANCE_MODE",
  onErrorMarkerDetected,
  maxRetries = 3,
  retryBaseDelayMs = 500,
  isRetryableError = defaultIsRetryableError,
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
          // 1回分の呼び出し(=1回のfetch)を毎回新しく作るための関数。
          // builderは一度awaitすると使い回せない(再fetchされない)ので、
          // リトライのたびに target.rpc(...) を呼び直して新しいbuilderを作る。
          const runOnce = () =>
            Reflect.get(target, prop, receiver).apply(target, args);

          const executeWithRetry = async () => {
            let lastResult: any;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              lastResult = await runOnce();
              if (!lastResult.error || !isRetryableError(lastResult.error)) {
                break;
              }
              if (attempt < maxRetries) {
                await sleep(retryBaseDelayMs * 2 ** attempt);
              }
            }
            if (lastResult && lastResult.error) checkError(lastResult.error);
            return lastResult;
          };

          // 呼び出し元は今までどおり `await supabase.rpc(...)` するだけで、
          // 中で最大 maxRetries 回までリトライされた結果が返ってくる。
          // (元のbuilderのメソッドチェーンには依存していないので、
          //  .single() 等をチェーンしている呼び出し元がある場合は
          //  別途対応が必要な点だけ注意)
          return executeWithRetry();
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}