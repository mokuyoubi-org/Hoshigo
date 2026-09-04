// KataGoEngineContext.tsx
//
// ─── このContextの責務 ───────────────────────────────
// KataGo(WebView内)への解析リクエストの、唯一かつ直列化された入口を提供する。
//
// 直列化ロック(isAnalyzingRef)と受信箱(resultCallbackRef)を両方
// このContext側に持たせ、runAnalysis()を通した呼び出しは呼び出し元が
// 何であっても必ず1本の経路に収束するようにした。
//
// 起動シーケンス:
// 1. DEFAULT_MODEL_ID だけをブロッキングでウォームアップ → engineReady=true
//    (ここまでがユーザーの体感待ち時間。初回のみモデルDLが発生する)
// 2. 残りのモデルは裏で(UIをブロックせず)順にウォームアップ
//
// loadProgress は「今どのモデルの、ダウンロード中/ウォームアップ中の
// どちらの段階か」を保持する。DEFAULT_MODEL_ID の準備が終わった時点で
// 一度nullに戻す(=それ以降の裏ウォームアップの進捗はUIに出さない)。
//
// readyModelIds は「完全にウォームアップが終わって、今すぐ遅延なく
// 使えるモデルID」の集合。warmupModelがresolveするたびに1つずつ増える。
// b18のような重いモデルがまだDL/ウォームアップ中の間は、呼び出し側が
// 「より軽いモデルにフォールバックする」ための判断材料として使う。
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
} from "./web-katrain/analyzeBoard";
import { DEFAULT_MODEL_ID, ModelId } from "./web-katrain/modelManager";

// ────────────────────────────────────────────────────────────────
// Context の型（使う側はこれだけ見ればOK）
// ────────────────────────────────────────────────────────────────

export type LoadProgressState = {
  modelId: ModelId;
  stage: ModelLoadStage;
} | null;

export type KataGoEngineContextType = {
  engineReady: boolean;
  setupError: string | null;
  // デフォルトモデルの準備中(ダウンロード or ウォームアップ)だけ値が入る。
  // それ以外(キャッシュ済み起動・準備完了後の裏ウォームアップ)はnull。
  loadProgress: LoadProgressState;
  // 今すぐ遅延なく使えるモデルIDの集合。engineReady=true時点で最低でも
  // DEFAULT_MODEL_IDは必ず入っている。他のモデルは裏ウォームアップが
  // 完了するたびに増えていく(リアクティブなのでコンポーネントは再描画される)。
  readyModelIds: ReadonlySet<ModelId>;
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
  const [loadProgress, setLoadProgress] = useState<LoadProgressState>(null);
  const [readyModelIds, setReadyModelIds] = useState<ReadonlySet<ModelId>>(
    new Set(),
  );

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

  const handleLoadProgress = (event: {
    modelId: ModelId;
    stage: ModelLoadStage;
  }) => {
    setLoadProgress(event);
  };

  // モデル1つのウォームアップが成功したら、readyModelIdsに追加する共通処理。
  // (warmupModel自体は失敗時ここに来ず、内部でcatchしてログを出すだけなので
  //  失敗したモデルはreadyModelIdsに入らないまま=正しくフォールバック対象になる)
  const markModelReady = (id: ModelId) => {
    setReadyModelIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
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

      // 3. まずデフォルトモデルだけ待つ → ここで即プレイ可能にする
      await engine.warmupModel(DEFAULT_MODEL_ID);
      markModelReady(DEFAULT_MODEL_ID);
      setLoadProgress(null); // デフォルトモデル分の進捗表示は役目終了
      setEngineReady(true);
      console.log(
        `[KataGoContext] デフォルトモデル(${DEFAULT_MODEL_ID})準備完了、プレイ可能に`,
      );

      // 4. 残りのモデルは裏でこっそりウォームアップ（UIをブロックしない）
      const remaining = WARMUP_MODEL_IDS.filter(
        (id) => id !== DEFAULT_MODEL_ID,
      );
      for (const modelId of remaining) {
        await engine.warmupModel(modelId);
        markModelReady(modelId);
      }
      console.log("[KataGoContext] 全モデルのウォームアップ完了");
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
        loadProgress,
        readyModelIds,
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
// 🌟loadProgress: デフォルトモデルの読み込み進捗。
//    {modelId, stage:{phase:"downloading",loaded,total}} または
//    {modelId, stage:{phase:"warming_up",step,totalSteps}} または null。変数。
// 🌟readyModelIds: 今すぐ遅延なく使えるモデルIDの集合(Set)。変数。
// 🌟runAnalysis: 盤面を渡すとKataGoの解析結果が返ってくる。非同期関数。
// await runAnalysis(args) みたいな感じ。実際にはuseKataGo経由で使うことが多い。
export function useKataGoEngine(): KataGoEngineContextType {
  const ctx = useContext(KataGoEngineContext);
  if (!ctx)
    throw new Error("useKataGoEngine must be used within KataGoEngineProvider");
  return ctx;
}
