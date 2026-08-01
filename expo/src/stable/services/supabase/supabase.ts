// ====================================================================================
// 【ファイル全体の責務】
// Supabaseサーバーと通信するための「窓口（supabase）」を準備し、ログイン処理（URLからの認証）を行う。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================
import { storage } from "@/src/stable/services/storage/storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// 🟨supabaseUrlおよびsupabaseAnonKeyをenvから取得
// ここ自体をいじることはないかもしれないが、envをいじる可能性はあるため、黄色にしている。
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 🟩🟧起動時に「鍵がないよ！」って壊れるのを防ぐチェック
// このチェックは、外部からこのsupabase.tsファイルが最初にimportされた時に一度実行される。
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SupabaseのURLかキーが設定されてません。.envを確認してください");
}

// 🟩🟧createClientはsupabase窓口を準備してくれている。Supabaseチームが作った関数なので理解しなくていい。
// createClientは、外部からこのsupabase.tsファイルが最初にimportされた時に一度実行される。
const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage, // ここで俺らがstorage.tsで作ったstorageオブジェクトを渡している。
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

/**
 * 🟩supabaseサーバからURLを受け取ると、そこからトークンを抽出する関数
 * supabaseサーバからurlを受け取るのは、Googleログインやメール認証などの際。
 */
const parseAuthTokens = (url: string) => {
  // ? の後のクエリか、# の後のハッシュのどっちにあっても拾えるようにする
  const cleanUrl = url.replace("#", "?");
  const urlObj = new URL(cleanUrl);

  const access_token = urlObj.searchParams.get("access_token");
  const refresh_token = urlObj.searchParams.get("refresh_token");

  return { access_token, refresh_token };
};

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

/**
 * 🟩🟦使い方:
 * supabaseは、要はサーバと通信するための窓口となるオブジェクト。
 * supabase.auth.setSession()やsupabase.rpc()など、supabaseサーバと通信したい時に使う。
 */
export const supabase = rawSupabase;

/**
 * 🟩🟦使い方:
 * handleAuthCallback()は、urlを受け取るとデバイスをログイン状態にしてくれる関数。
 * {data,error}=handleAuthCallback(url)のように使う。
 */
export const handleAuthCallback = async (url: string) => {
  try {
    // parseAuthTokens()関数でurlからaccess_tokenとrefresh_tokenを抜き出す
    const { access_token, refresh_token } = parseAuthTokens(url);

    if (access_token && refresh_token) {
      // setSession()関数は端末をログイン状態にしてくれる。Supabaseチームが作った関数なので理解しなくていい。
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      return { data, error };
    }

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
