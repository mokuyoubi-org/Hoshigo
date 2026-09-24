// KataGoEngine.tsx

"use dom";

import { useDOMImperativeHandle } from "expo/dom";
import React, { Ref, useEffect, useRef } from "react";
import {
  analyzeBoard,
  AnalyzeBoardArgs,
  AnalyzeResult,
  loadModel,
  ModelLoadStage,
} from "./analyzeBoard";
import { initTf } from "./initTf";
import { hasModelInIDB, ModelId } from "./modelManager";

export type KataGoEngineRef = {
  analyzeBoard: (args: AnalyzeBoardArgs) => Promise<AnalyzeResult | null>;
  warmupModel: (id: ModelId) => Promise<void>;
  // 指定モデルがIndexedDBに存在するかどうかだけを確認する(DLはしない、軽量)。
  // ⚠️ 戻り値のPromiseはネイティブでは信用できない可能性がある(warmupModelと
  // 同じブリッジの制約 — ref越しの呼び出しは実処理の完了を待たず解決してしまう)。
  // 本当の結果は onHasModelChecked コールバック経由でのみ判定すること。
  hasModel: (id: ModelId) => Promise<boolean>;
};

type DOMProps = {
  matchContents?: boolean;
  androidLayerType?: "none" | "software" | "hardware";
  webviewProps?: Record<string, any>;
  [key: string]: any; // その他のExpo DOMオプションも通るようにしておく外枠
};

export type Props = {
  ref: Ref<KataGoEngineRef>;
  dom?: DOMProps;
  onReady: () => void;
  onError: (message: string) => void;
  onAnalyzeComplete?: (result: AnalyzeResult) => void;
  // モデルの読み込み進捗通知(ダウンロード中/ウォームアップ中の両方を含む)。
  // IndexedDBキャッシュ済みでダウンロードが不要な場合は"downloading"は呼ばれず、
  // いきなり"warming_up"から始まる。
  onLoadProgress?: (event: { modelId: ModelId; stage: ModelLoadStage }) => void;
  // warmupModelが実際に完了した瞬間に呼ばれる。
  // 注意: warmupModel()自体のawaitはbridge越しだと即解決してしまい信用できないため、
  // 「本当に完了したか」はこのコールバック(props経由=本物の往復通信)でのみ判定する。
  onModelReady?: (id: ModelId) => void;
  // hasModel()の本当の結果を伝える。
  // 注意: 「軽い問い合わせだからawaitで信用できるはず」という前提が誤りだった疑いがある。
  // warmupModelと全く同じ理由(ref越しの呼び出しは実処理の完了を待たずに解決してしまう)
  // でネイティブでは信用できず、Web(iframe+postMessage)では正しく待てる、という
  // 非対称性が疑われている。必ずこのコールバック経由で結果を判定すること。
  onHasModelChecked?: (id: ModelId, exists: boolean) => void;
};

export default function KataGoEngine({
  ref,
  onReady,
  onError,
  onAnalyzeComplete,
  onLoadProgress,
  onModelReady,
  onHasModelChecked,
}: Props) {
  const initializedRef = useRef(false);

  useEffect(() => {
    // 🛡️ガード
    if (initializedRef.current) return;
    initializedRef.current = true;
    initTf()
      .then(() => onReady())
      .catch((e: unknown) => onError(String(e)));
  }, []);

  useDOMImperativeHandle(
    ref as any,
    () =>
      ({
        analyzeBoard: async (
          args: AnalyzeBoardArgs,
        ): Promise<AnalyzeResult | null> => {
          try {
            const result = await analyzeBoard(args);
            if (!result) return null;
            const formattedResult: AnalyzeResult = {
              ...result,
              ownership: result.ownership
                ? (Array.from(result.ownership) as any)
                : result.ownership,
              ownershipStdev: result.ownershipStdev
                ? (Array.from(result.ownershipStdev) as any)
                : result.ownershipStdev,
              policy: result.policy
                ? (Array.from(result.policy) as any)
                : result.policy,
            };
            if (onAnalyzeComplete) onAnalyzeComplete(formattedResult);
            return formattedResult;
          } catch (e) {
            console.error("🌐 [WebView内] analyzeBoard 実行エラー:", e);
            return null;
          }
        },
        warmupModel: async (id: ModelId): Promise<void> => {
          try {
            await loadModel(id, (stage) => {
              onLoadProgress?.({ modelId: id, stage });
            });
            console.log(`🔥 [KataGoEngine] ${id} のウォームアップ完了`);
            onModelReady?.(id);
          } catch (e) {
            console.error(`[KataGoEngine] ウォームアップ失敗: ${id}`, e);
          }
        },
        hasModel: async (id: ModelId): Promise<boolean> => {
          try {
            const exists = await hasModelInIDB(id);
            console.log(`🔎 [KataGoEngine] hasModel(${id}) 実測結果 = ${exists}`);
            onHasModelChecked?.(id, exists);
            return exists;
          } catch (e) {
            console.error(`[KataGoEngine] hasModel確認失敗: ${id}`, e);
            onHasModelChecked?.(id, false);
            return false;
          }
        },
      }) as any,
    [onAnalyzeComplete, onLoadProgress, onModelReady, onHasModelChecked],
  );
  return <div style={{ display: "none" }} />;
}