// KataGoEngineContext.tsx
//
// ─── このContextの責務 ───────────────────────────────
// KataGo(WebView内)への解析リクエストの、唯一かつ直列化された入口を提供する。
//
// ─── 2026-08 変更: runAnalysisへの集約 ───
// 以前はregisterResultCallback(受信箱への登録)を外部に公開し、
// 呼び出し側(useKataGo)ごとに「直列化ロック」を持たせていた。
// しかしWebViewブリッジと受信箱はこのContext1つに対して1つしか無い
// 共有リソースなので、ロックが呼び出し側ごとに分散していると、
// 別々のhookインスタンス(例: useBotMove内部のuseKataGo と
// useMatchSessionのuseKataGo)から同時に解析を投げられてしまい、
// 「推論中にもう一つ推論してしまい壊れる」不具合の原因になっていた。
//
// 今は直列化ロック(isAnalyzingRef)と受信箱(resultCallbackRef)を両方
// このContext側に持たせ、runAnalysis()を通した呼び出しは呼び出し元が
// 何であっても必ず1本の経路に収束するようにした。
//
// ─── 2026-09-01 変更: androidLayerType追加 ───
// Turnstile(Cloudflare CAPTCHA)用の隠しWebViewをAndroidに追加したところ、
// 画面全体が白くなる不具合が発生。原因はAndroidのWebView特有の
// Surface重なりバグ(複数WebView併存時にハードウェアレイヤーが競合する)
// と推測し、こちら側のWebViewも androidLayerType="software" に変更して
// 検証中。
// ──────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import KataGoEngine, { KataGoEngineRef } from "./KataGoEngine";
import { AnalyzeBoardArgs, AnalyzeResult } from "./web-katrain/analyzeBoard";
import { ModelId } from "./web-katrain/modelManager";

// ────────────────────────────────────────────────────────────────
// Context の型（使う側はこれだけ見ればOK）
// ────────────────────────────────────────────────────────────────

export type KataGoEngineContextType = {
  engineReady: boolean;
  setupError: string | null;
  // 盤面解析リクエストの唯一の入口。WebViewとの通信・結果受信箱の管理・
  // 多重呼び出しの直列化を全部ここでやる。呼び出し元は結果を待つだけでいい。
  runAnalysis: (args: AnalyzeBoardArgs) => Promise<AnalyzeResult | null>;
};
const KataGoEngineContext = createContext<KataGoEngineContextType | null>(null);

const WARMUP_MODEL_IDS: ModelId[] = ["b6", "b10", "b18"]; // 3つ全部

// ────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────

export function KataGoEngineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const engineRef = useRef<KataGoEngineRef | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const engineReadyRef = useRef(false);
  useEffect(() => {
    engineReadyRef.current = engineReady;
  }, [engineReady]);

  // WebViewから結果が届いたら呼ばれる、たった1つの受信箱。
  const resultCallbackRef = useRef<
    ((result: AnalyzeResult | null) => void) | null
  >(null);

  // 分析は同時に1件まで。呼び出し元がどのhookのどのインスタンスであっても、
  // ここで直列化する。(これが無いと多重推論でWebView側が壊れる)
  const isAnalyzingRef = useRef(false);

  const handleAnalyzeComplete = (result: AnalyzeResult) => {
    console.log("🔔 [KataGoContext] WebViewから完成通知を受信");
    if (resultCallbackRef.current) {
      resultCallbackRef.current(result);
      resultCallbackRef.current = null;
    }
  };

  const handleEngineReady = async () => {
    console.log(`[KataGoContext] ウォームアップ開始`);
    try {
      // 1. WebViewネイティブ領域の初期化をほんの少し待つ安全マージン♪
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Bridgeがしっかり開通するまで安全にループチェックする
      let attempts = 0;
      while (attempts < 20) {
        try {
          if (
            engineRef.current &&
            typeof engineRef.current.analyzeBoard === "function"
          ) {
            console.log("[KataGoContext] Bridge接続完了");
            break;
          }
        } catch {
          // まだWebViewネイティブ側が未準備のときはエラーを無視して待つ
        }
        console.log("[KataGoContext] Bridge接続待機中…");
        await new Promise((resolve) => setTimeout(resolve, 300));
        attempts++;
      }

      const engine = engineRef.current;
      if (!engine || !engine.warmupModel) {
        setSetupError("エンジンの初期化に失敗（Bridge未接続）");
        return;
      }

      for (const modelId of WARMUP_MODEL_IDS) {
        await engine.warmupModel(modelId);
      }

      setEngineReady(true);
    } catch (e) {
      console.error("[KataGoContext] ウォームアップエラー:", e);
      setSetupError(String(e));
    }
  };

  const waitForEngineReady = async (maxWaitMs = 15000): Promise<boolean> => {
    const startTime = Date.now();
    while (!engineReadyRef.current) {
      if (Date.now() - startTime > maxWaitMs) return false;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return true;
  };

  // ── 唯一の解析入口。直列化込み ─────────────────────────
  const runAnalysis = async (
    args: AnalyzeBoardArgs,
  ): Promise<AnalyzeResult | null> => {
    const isReady = await waitForEngineReady();
    if (!isReady || !engineRef.current) {
      console.warn(
        "[KataGoContext] エンジンが利用可能になりませんでした(Skip)",
      );
      return null;
    }

    // 前の解析が終わるまで待つ(直列化の本体)
    while (isAnalyzingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    isAnalyzingRef.current = true;

    try {
      return await new Promise<AnalyzeResult | null>((resolve) => {
        let timeoutId: ReturnType<typeof setTimeout>;

        resultCallbackRef.current = (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        };

        timeoutId = setTimeout(() => {
          console.warn("[KataGoContext] 推論結果の受信がタイムアウトした…");
          resultCallbackRef.current = null;
          resolve(null);
        }, 300000);

        try {
          engineRef.current!.analyzeBoard(args);
        } catch (e) {
          console.error("[KataGoContext] analyzeBoard 呼び出しエラー:", e);
          clearTimeout(timeoutId);
          resolve(null);
        }
      });
    } finally {
      isAnalyzingRef.current = false;
    }
  };

  return (
    <KataGoEngineContext.Provider
      value={{
        engineReady,
        setupError,
        runAnalysis,
      }}
    >
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          width: 0,
          height: 0,
        }}
      >
        <KataGoEngine
          ref={engineRef}
          dom={{
            matchContents: true,
            androidLayerType: "software",
          }}
          onReady={handleEngineReady}
          onError={(err) => {
            console.error("[KataGoContext] KataGoEngine エラー:", err);
            setSetupError(err);
          }}
          onAnalyzeComplete={handleAnalyzeComplete}
        />
      </View>
      {children}
    </KataGoEngineContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────
// 使える道具
// 🌟engineReady: katagoが準備完了かどうか。trueかfalse。変数
// 🌟setupError: katagoがエラーで準備できなかったかどうか。nullかstring(エラーメッセージ)。変数。
// 🌟runAnalysis: 盤面を渡すとKataGoの解析結果が返ってくる。非同期関数。
// await runAnalysis(args) みたいな感じ。実際にはuseKataGo経由で使うことが多い。
export function useKataGoEngine(): KataGoEngineContextType {
  const ctx = useContext(KataGoEngineContext);
  if (!ctx)
    throw new Error("useKataGoEngine must be used within KataGoEngineProvider");
  return ctx;
}
