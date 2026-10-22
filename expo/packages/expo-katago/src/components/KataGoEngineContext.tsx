// packages/expo-katago/src/components/KataGoEngineContext.tsx
//
// ─── このContextの責務 ───────────────────────────────
// KataGo(WebView内)への解析リクエストの入口を提供する。
//
// 行列(キュー)は管理しない。1件ずつしか受け付けず、推論中に依頼が来たら
// 何もせず null を返して断る。「今、推論中か」は isAnalyzing で外から見える。
// 行列の整理は、使う側(expo/src)の責務。
//
// ⚠️ ブリッジ越しの呼び出しは「戻り値のPromiseは信用しない」が鉄則。
// 解析の結果も、warmupModelの完了・失敗も、
// コールバック(onAnalyzeComplete / onModelReady / onModelError)で受け取る。
// WebView側は、成功でも失敗でも必ずonAnalyzeCompleteを呼ぶ
// (失敗時はnull)ので、結果待ちがいつまでも終わらないことはない。
//
// 起動シーケンス:
// 1. WebView内でinitTf(TensorFlow.jsのバックエンド選び)が終わると onReady が呼ばれる
// 2. モデルをウォームアップする。
//    IndexedDBに無ければR2から自動でダウンロードする(確認ダイアログは出さない)。
//    その進捗は loadProgress に入る
// 3. 完了(onModelReady)したら engineReady=true にしてゲートを開ける
// 4. 失敗(onModelError)したら setupError に入れて、ゲートがエラー画面を出す
//
// loadProgress は「今、ダウンロード中/ウォームアップ中のどちらの段階か」を保持する。
//
// ──────────────────────────────────────────────────

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import {
  AnalyzeBoardArgs,
  AnalyzeResultFields,
  AnalyzeResultFor,
  KataGoEngineRef,
  LoadProgressState,
  ModelLoadStage,
} from "../types/types";
import KataGoEngine from "./KataGoEngine";

// ────────────────────────────────────────────────────────────────
// Context の型（使う側はこれだけ見ればOK）
// ────────────────────────────────────────────────────────────────

type KataGoEngineContextType = {
  engineReady: boolean;
  setupError: string | null;
  loadProgress: LoadProgressState;
  // 今、推論中か(true=作業中 / false=暇)
  isAnalyzing: boolean;
  // 推論中に呼ぶと、何もせず null を返す(断る)。
  runAnalysis: <const F extends AnalyzeResultFields>(
    args: AnalyzeBoardArgs & { fields: F },
  ) => Promise<AnalyzeResultFor<F> | null>;
};

const KataGoEngineContext = createContext<KataGoEngineContextType | null>(null);

export const KataGoEngineProvider = ({ children }: { children: ReactNode }) => {
  const engineRef = useRef<KataGoEngineRef | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<LoadProgressState>(null);

  const engineReadyRef = useRef(false);
  useEffect(() => {
    engineReadyRef.current = engineReady;
  }, [engineReady]);

  // 🔍 診断用: このProviderインスタンスを一意に識別するID。
  const [instanceId] = useState(() => Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    console.log(`[KataGoContext][instance=${instanceId}] マウント`);
    return () => {
      console.log(`[KataGoContext][instance=${instanceId}] アンマウント`);
    };
  }, [instanceId]);

  // WebViewから結果が届いたら呼ばれる、たった1つの受信箱。
  const resultCallbackRef = useRef<((result: unknown) => void) | null>(null);

  // ── 解析(1件だけ受け付ける) ──────────────────────
  // isProcessingRef: 「今まさに1件処理中か」を判定する、即座に読める旗(ref)。
  // isAnalyzing: 同じ内容を、画面などの外の世界に見せるためのstate。
  const isProcessingRef = useRef(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
  async function runAnalysis<const F extends AnalyzeResultFields>(
    args: AnalyzeBoardArgs & { fields: F },
  ): Promise<AnalyzeResultFor<F> | null> {
    if (isProcessingRef.current) {
      console.warn("[KataGoContext] 推論中のため、依頼を無視しました");
      return null;
    }
    isProcessingRef.current = true;
    setIsAnalyzing(true);

    try {
      const isReady = await waitForEngineReady();
      if (!isReady || !engineRef.current) {
        console.warn(
          "[KataGoContext] エンジンが利用可能になりませんでした(Skip)",
        );
        return null;
      }

      const result = await new Promise<unknown>((resolve) => {
        resultCallbackRef.current = resolve;

        try {
          engineRef.current!.analyzeBoard(args); // 🌟要はここ。
        } catch (e) {
          console.error("[KataGoContext] analyzeBoard 呼び出しエラー:", e);
          resultCallbackRef.current = null;
          resolve(null);
        }
      });

      return result as AnalyzeResultFor<F> | null;
    } finally {
      isProcessingRef.current = false;
      setIsAnalyzing(false);
    }
  }

  const handleAnalyzeComplete = (result: unknown) => {
    if (resultCallbackRef.current) {
      resultCallbackRef.current(result);
      resultCallbackRef.current = null;
    }
  };

  const handleLoadProgress = (event: { stage: ModelLoadStage }) => {
    setLoadProgress(event);
  };

  // 「モデルのウォームアップが本当に終わった」ことを待つための受付表。
  const modelReadyWaitersRef = useRef<(() => void)[]>([]);

  const waitForModelReady = (): Promise<void> => {
    return new Promise((resolve) => {
      modelReadyWaitersRef.current.push(resolve);
    });
  };

  const handleModelReady = () => {
    modelReadyWaitersRef.current.forEach((resolve) => resolve());
    modelReadyWaitersRef.current = [];
  };

  // ダウンロード失敗など。エラー画面に切り替わる。
  const handleModelError = (message: string) => {
    console.error(`[KataGoContext] 準備に失敗:`, message);
    setSetupError(message);
  };

  const hasStartedRef = useRef(false);

  const handleEngineReady = async () => {
    console.log(
      `[KataGoContext][instance=${instanceId}] handleEngineReady呼び出された`,
    );
    if (hasStartedRef.current) {
      console.log(
        `[KataGoContext][instance=${instanceId}] handleEngineReady 二重発火をスキップ`,
      );
      return;
    }
    hasStartedRef.current = true;

    console.log(`[KataGoContext][instance=${instanceId}] ウォームアップ開始`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

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
        await new Promise((resolve) => setTimeout(resolve, 300));
        attempts++;
      }

      const engine = engineRef.current;
      if (!engine || !engine.warmupModel) {
        setSetupError("エンジンの初期化に失敗（Bridge未接続）");
        return;
      }

      // 先に「完了待ち」を登録してから呼ぶ(完了通知を取りこぼさないため)
      console.log(`[KataGoContext] warmupModel呼び出し`);
      const modelReady = waitForModelReady();
      engine.warmupModel();
      await modelReady;
      console.log(`[KataGoContext] 完了確認OK`);

      setEngineReady(true);
      setLoadProgress(null);
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

  return (
    <KataGoEngineContext.Provider
      value={{
        engineReady,
        setupError,
        loadProgress,
        isAnalyzing,
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
          onLoadProgress={handleLoadProgress}
          onModelReady={handleModelReady}
          onModelError={handleModelError}
        />
      </View>
      {children}
    </KataGoEngineContext.Provider>
  );
};

// ────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────
export const useKataGoEngine = () => {
  const ctx = useContext(KataGoEngineContext);
  if (!ctx)
    throw new Error("useKataGoEngine must be used within KataGoEngineProvider");
  return ctx;
};
