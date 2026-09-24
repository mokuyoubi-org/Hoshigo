// KataGoEngineContext.tsx
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
// ⚠️ ブリッジ越しの呼び出しは常に1つずつ、かつ「戻り値のPromiseは信用しない」
// が鉄則。warmupModelだけでなくhasModelも同じ制約を持つ疑いがあるため、
// どちらも「呼びっぱなし＋onXxxコールバックで完了を待つ」形に統一している。
//
// 起動シーケンス:
// 1. DEFAULT_MODEL_ID だけをブロッキングでウォームアップ
// 2. b18が「前回既にDL済みか」を、hasModelのコールバック待ちで確認する
//    (ブリッジ呼び出しを同時に飛ばさないよう、b10より先に・直列で行う)
// 3. b10を待つ
// 4. ②でDL済みと判明していれば、続けてb18も待つ
// 5. ここまで全部揃ってから engineReady=true にしてゲートを開ける
//    (b18が起動時点で未DLの場合は、b6/b10だけでゲートが開く)
//
// loadProgress は「今どのモデルの、ダウンロード中/ウォームアップ中の
// どちらの段階か」を保持する。
//
// readyModelIds は「完全にウォームアップが終わって、今すぐ遅延なく
// 使えるモデルID」の集合。warmupModelがresolveするたびに1つずつ増える。
//
// downloadedModelIds は「DL自体は完了していると判明しているが、まだ
// ウォームアップが終わっていない(readyでない)」モデルの集合。b18が
// 「番待ち」の間、UI上で誤ってnot_downloadedに見えないようにするための
// 補助情報。
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
import KataGoEngine, { KataGoEngineRef } from "./KataGoEngine";
import {
  AnalyzeBoardArgs,
  AnalyzeResult,
  ModelLoadStage,
} from "./analyzeBoard";
import { DEFAULT_MODEL_ID, ModelId } from "./modelManager";
import {
  getModelStatus as computeModelStatus,
  LoadProgressState,
  ModelStatus,
} from "./modelStatus";

// ────────────────────────────────────────────────────────────────
// Context の型（使う側はこれだけ見ればOK）
// ────────────────────────────────────────────────────────────────

export type { LoadProgressState, ModelStatus }; // 他ファイルからの参照用に再エクスポート

export type KataGoEngineContextType = {
  engineReady: boolean;
  setupError: string | null;
  loadProgress: LoadProgressState;
  readyModelIds: ReadonlySet<ModelId>;
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
  getModelStatus: (id: ModelId) => ModelStatus;
  downloadB18: () => void;
};
const KataGoEngineContext = createContext<KataGoEngineContextType | null>(null);

export function KataGoEngineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const engineRef = useRef<KataGoEngineRef | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<LoadProgressState>(null);
  const [readyModelIds, setReadyModelIds] = useState<ReadonlySet<ModelId>>(
    new Set(),
  );
  const [downloadedModelIds, setDownloadedModelIds] = useState<
    ReadonlySet<ModelId>
  >(new Set());

  const engineReadyRef = useRef(false);
  useEffect(() => {
    engineReadyRef.current = engineReady;
  }, [engineReady]);

  const readyModelIdsRef = useRef(readyModelIds);
  useEffect(() => {
    readyModelIdsRef.current = readyModelIds;
  }, [readyModelIds]);

  // 🔍 診断用: このProviderインスタンスを一意に識別するID。
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    console.log(`[KataGoContext][instance=${instanceIdRef.current}] マウント`);
    return () => {
      console.log(
        `[KataGoContext][instance=${instanceIdRef.current}] アンマウント`,
      );
    };
  }, []);

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
      }, 300000);

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
    modelId: ModelId;
    stage: ModelLoadStage;
  }) => {
    setLoadProgress(event);
  };

  const modelReadyWaitersRef = useRef<Map<ModelId, (() => void)[]>>(new Map());

  const waitForModelReady = (id: ModelId): Promise<void> => {
    return new Promise((resolve) => {
      const waiters = modelReadyWaitersRef.current.get(id) ?? [];
      waiters.push(resolve);
      modelReadyWaitersRef.current.set(id, waiters);
    });
  };

  const handleModelReady = (id: ModelId) => {
    markModelReady(id);
    const waiters = modelReadyWaitersRef.current.get(id);
    if (waiters) {
      waiters.forEach((resolve) => resolve());
      modelReadyWaitersRef.current.delete(id);
    }
  };

  const hasModelWaitersRef = useRef<
    Map<ModelId, ((exists: boolean) => void)[]>
  >(new Map());

  const waitForHasModelResult = (
    id: ModelId,
    timeoutMs = 5000,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(
          `[KataGoContext] hasModel(${id}) の結果がタイムアウト(${timeoutMs}ms)。falseとして扱う`,
        );
        resolve(false);
      }, timeoutMs);

      const waiters = hasModelWaitersRef.current.get(id) ?? [];
      waiters.push((exists) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(exists);
      });
      hasModelWaitersRef.current.set(id, waiters);
    });
  };

  const handleHasModelChecked = (id: ModelId, exists: boolean) => {
    console.log(`[KataGoContext] onHasModelChecked受信: ${id} = ${exists}`);
    const waiters = hasModelWaitersRef.current.get(id);
    if (waiters) {
      waiters.forEach((resolve) => resolve(exists));
      hasModelWaitersRef.current.delete(id);
    }
  };

  const markModelReady = (id: ModelId) => {
    setReadyModelIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const hasStartedRef = useRef(false);

  const b18WarmupStartedRef = useRef(false);
  const ensureB18Warmup = () => {
    if (b18WarmupStartedRef.current || readyModelIdsRef.current.has("b18")) {
      return;
    }
    b18WarmupStartedRef.current = true;

    const engine = engineRef.current;
    if (!engine || !engine.warmupModel) {
      console.warn("[KataGoContext] ensureB18Warmup: エンジン未準備");
      b18WarmupStartedRef.current = false;
      return;
    }

    console.log("[KataGoContext] b18のwarmupModel呼び出し(呼びっぱなし)");
    engine.warmupModel("b18");
  };

  const handleEngineReady = async () => {
    console.log(
      `[KataGoContext][instance=${instanceIdRef.current}] handleEngineReady呼び出された`,
    );
    if (hasStartedRef.current) {
      console.log(
        `[KataGoContext][instance=${instanceIdRef.current}] handleEngineReady 二重発火をスキップ`,
      );
      return;
    }
    hasStartedRef.current = true;

    console.log(
      `[KataGoContext][instance=${instanceIdRef.current}] ウォームアップ開始`,
    );
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

      console.log(`[KataGoContext] ${DEFAULT_MODEL_ID} のwarmupModel呼び出し`);
      engine.warmupModel(DEFAULT_MODEL_ID);
      await waitForModelReady(DEFAULT_MODEL_ID);
      console.log(`[KataGoContext] ${DEFAULT_MODEL_ID} 完了確認OK`);

      console.log(
        "[KataGoContext] b18のhasModel呼び出し(呼びっぱなし、結果はコールバック待ち)",
      );
      engine.hasModel("b18");
      let b18AlreadyDownloaded = false;
      try {
        b18AlreadyDownloaded = await waitForHasModelResult("b18");
        console.log(
          `[KataGoContext] b18AlreadyDownloaded = ${b18AlreadyDownloaded}`,
        );
        if (b18AlreadyDownloaded) {
          setDownloadedModelIds((prev) => new Set(prev).add("b18"));
        }
      } catch (e) {
        console.warn("[KataGoContext] b18の既存チェックに失敗:", e);
      }

      console.log("[KataGoContext] b10のwarmupModel呼び出し");
      engine.warmupModel("b10");
      await waitForModelReady("b10");
      console.log("[KataGoContext] b10 完了確認OK");

      if (b18AlreadyDownloaded) {
        ensureB18Warmup();
        await waitForModelReady("b18");
        console.log("[KataGoContext] b18 完了確認OK");
      }

      setEngineReady(true);
      setLoadProgress(null);
    } catch (e) {
      console.error("[KataGoContext] ウォームアップエラー:", e);
      setSetupError(String(e));
    }
  };

  const downloadB18 = () => {
    ensureB18Warmup();
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
        readyModelIds,
        runAnalysis,
        cancelQueuedAnalysis,
        getModelStatus: (id) =>
          computeModelStatus(
            id,
            readyModelIds,
            loadProgress,
            downloadedModelIds,
          ),
        downloadB18,
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
          onHasModelChecked={handleHasModelChecked}
        />
      </View>
      {children}
    </KataGoEngineContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────
export function useKataGoEngine(): KataGoEngineContextType {
  const ctx = useContext(KataGoEngineContext);
  if (!ctx)
    throw new Error("useKataGoEngine must be used within KataGoEngineProvider");
  return ctx;
}
