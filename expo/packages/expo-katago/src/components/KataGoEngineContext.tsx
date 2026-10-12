// packages/expo-katago/src/components/KataGoEngineContext.tsx
//
// ─── このContextの責務 ───────────────────────────────
// KataGo(WebView内)への解析リクエストの、唯一かつ直列化された入口を提供する。
//
// 解析の依頼(job)は1列のキュー(queueRef)に積まれ、1件ずつ順番に処理される
// (isProcessingRefが「今まさに1件処理中か」を示す唯一のフラグ)。
//
// 待ち行列に積まれた「まだ実行されていない」仕事は、requestIdを指定して
// いれば cancelQueuedAnalysis(requestId) で後から取り消せる。取り消された
// 仕事は列から静かに取り除かれ、resolve(null)ですぐ終わる。
// ⚠️ 重要: キャンセルは「isProcessingRef(実行権)には一切触れない」設計に
// している。「今まさに実行中」の1件はキャンセル対象に含まれない(KataGo本体に
// 計算を中断させる手段が無いため)。
//
// ⚠️ ブリッジ越しの呼び出しは「戻り値のPromiseは信用しない」が鉄則。
// warmupModelは「呼びっぱなし＋onModelReady/onModelErrorのコールバックで
// 完了・失敗を待つ」形にしている。
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

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import {
  AnalyzeBoardArgs,
  AnalyzeResult,
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
  // requestIdを指定すると、まだ実行されていない(待ち行列に積まれた)間だけ
  // cancelQueuedAnalysisで取り消せるようになる。省略した場合は取り消し不可。
  // 実行が始まった後は取り消せない(結果を最後まで待つことになる)。
  runAnalysis: (
    args: AnalyzeBoardArgs,
    requestId?: string,
  ) => Promise<AnalyzeResult | null>;
  // 待ち行列(まだ実行されていない分)の中から、指定したrequestIdに一致する
  // ものを取り消す。該当エントリはnullで即resolveされる。実行中の1件は
  // 対象外(中断できない)。何件消したかを返す。
  cancelQueuedAnalysis: (requestId: string) => number;
};
const KataGoEngineContext = createContext<KataGoEngineContextType | null>(null);

export const KataGoEngineProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
  const resultCallbackRef = useRef<
    ((result: AnalyzeResult | null) => void) | null
  >(null);

  // ── 解析キュー ──────────────────────────────────
  // isProcessingRef が「今まさに1件処理中か」を示す唯一のフラグ。
  // キャンセルはこのフラグに一切触れず、queueRef(まだ手をつけていない
  // 仕事の配列)から該当エントリを取り除くだけで完結する。
  type QueuedJob = {
    requestId: string | undefined;
    args: AnalyzeBoardArgs;
    resolve: (result: AnalyzeResult | null) => void;
  };
  const queueRef = useRef<QueuedJob[]>([]);
  const isProcessingRef = useRef(false);

  // 実際にKataGoへ1件投げて結果を待つ処理。
  const runJob = async (job: QueuedJob): Promise<void> => {
    const isReady = await waitForEngineReady();
    if (!isReady || !engineRef.current) {
      console.warn(
        "[KataGoContext] エンジンが利用可能になりませんでした(Skip)",
      );
      job.resolve(null);
      return;
    }

    const result = await new Promise<AnalyzeResult | null>((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout>;

      resultCallbackRef.current = (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      };

      timeoutId = setTimeout(() => {
        console.warn("[KataGoContext] 推論結果の受信がタイムアウトした…");
        resultCallbackRef.current = null;
        resolve(null);
      }, 600000);

      try {
        engineRef.current!.analyzeBoard(job.args);
      } catch (e) {
        console.error("[KataGoContext] analyzeBoard 呼び出しエラー:", e);
        clearTimeout(timeoutId);
        resolve(null);
      }
    });

    job.resolve(result);
  };

  // キューの先頭を1件取り出して処理する。処理中なら何もしない
  // (今処理してる分がfinallyで自分自身を再度呼ぶことで、自然と
  // 次の1件に進む「リレー」方式)。
  const processQueue = () => {
    if (isProcessingRef.current) return;
    const job = queueRef.current.shift();
    if (!job) return;
    isProcessingRef.current = true;
    runJob(job).finally(() => {
      isProcessingRef.current = false;
      processQueue();
    });
  };

  // ── 唯一の解析入口 ─────────────────────────
  const runAnalysis = (
    args: AnalyzeBoardArgs,
    requestId?: string,
  ): Promise<AnalyzeResult | null> => {
    return new Promise((resolve) => {
      queueRef.current.push({ requestId, args, resolve });
      processQueue();
    });
  };

  // まだ手をつけていない(＝queueRef内に残ってる)仕事だけを対象に取り消す。
  // isProcessingRefには一切触れないので、実行中の仕事には影響しない。
  const cancelQueuedAnalysis = (requestId: string): number => {
    const remaining: QueuedJob[] = [];
    let removedCount = 0;
    for (const job of queueRef.current) {
      if (job.requestId === requestId) {
        removedCount++;
        job.resolve(null);
      } else {
        remaining.push(job);
      }
    }
    queueRef.current = remaining;
    console.log(
      `[KataGoContext] cancelQueuedAnalysis(${requestId}): ${removedCount}件取り消し`,
    );
    return removedCount;
  };

  const handleAnalyzeComplete = (result: AnalyzeResult) => {
    if (resultCallbackRef.current) {
      resultCallbackRef.current(result);
      resultCallbackRef.current = null;
    }
  };

  const handleLoadProgress = (event: {
    stage: ModelLoadStage;
  }) => {
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
  const handleModelError = ( message: string) => {
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
        runAnalysis,
        cancelQueuedAnalysis,
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
