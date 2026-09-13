// createResilientClient.ts
//
// 通常のSupabaseクライアントに3つの上乗せをする:
//  1. rpc()の結果を横取りして、登録済みの複数のエラーマーカーのいずれかが
//     含まれていたら、対応するコールバックへ通知する
//  2. rpc()が失敗したとき、それが「論理エラー」(error.codeあり)でなければ
//     自動的に再送する(デフォルト最大3回、指数バックオフ)
//  3. appVersion/otaVersionをHTTPヘッダー(x-app-version/x-ota-version)として
//     全リクエストに自動付与する。サーバ側は current_setting('request.header.x-app-version', true)
//     等で読み取れるので、呼び出し元は個々のrpc呼び出しで明示的に渡す必要がない。
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

type ErrorMarkerHandler = {
  /** このマーカー文字列がerror.messageに含まれていたら発火する。メッセージは "MARKER: 詳細" の形式を前提とする */
  marker: string;
  onDetected: (extractedMessage: string) => void;
};

export type CreateResilientClientArgs = {
  url: string;
  anonKey: string;
  storage: StorageAdapter;
  /** x-app-versionヘッダーとして全リクエストに自動付与される */
  appVersion: string;
  /** x-ota-versionヘッダーとして全リクエストに自動付与される */
  otaVersion: string;
  /** 検知したいエラーマーカーのリスト。デフォルトは何も登録しない */
  errorMarkers?: ErrorMarkerHandler[];
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
  appVersion,
  otaVersion,
  errorMarkers = [],
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
    global: {
      // ここで一度だけセットすれば、以後の全リクエスト(rpc含む)に自動で付く。
      // サーバ側は current_setting('request.header.x-app-version', true) 等で読める。
      headers: {
        "x-app-version": appVersion,
        "x-ota-version": otaVersion,
      },
    },
  });

  const checkError = (error: { message: string } | null) => {
    if (!error) return;
    for (const { marker, onDetected } of errorMarkers) {
      if (error.message.includes(marker)) {
        const extracted = error.message
          .replace(new RegExp(`.*${marker}:\\s*`), "")
          .trim();
        onDetected(extracted);
        // サーバ側は1回のRAISE EXCEPTIONにつき1マーカーしか投げない設計なので、
        // 最初に一致したものだけ処理すれば十分。
        return;
      }
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
