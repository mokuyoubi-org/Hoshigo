// KataGoEngine.tsx

"use dom";

import { useDOMImperativeHandle } from "expo/dom";
import React, { Ref, useEffect, useRef } from "react";
import {
  AnalyzeBoardArgs,
  AnalyzeResult,
  ModelLoadStage,
  analyzeBoard,
  loadModel,
} from "./web-katrain/analyzeBoard";
import { initTf } from "./web-katrain/initTf";
import { ModelId } from "./web-katrain/modelManager";

export type KataGoEngineRef = {
  analyzeBoard: (args: AnalyzeBoardArgs) => Promise<AnalyzeResult | null>;
  warmupModel: (id: ModelId) => Promise<void>;
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
  onLoadProgress?: (event: {
    modelId: ModelId;
    stage: ModelLoadStage;
  }) => void;
};

export default function KataGoEngine({
  ref,
  onReady,
  onError,
  onAnalyzeComplete,
  onLoadProgress,
}: Props) {
  const initializedRef = useRef(false);

  useEffect(() => {
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
            // 1. モデルをロード（ダウンロード+ウォームアップの進捗はコールバック経由でRN側に通知）
            await loadModel(id, (stage) => {
              onLoadProgress?.({ modelId: id, stage });
            });
            console.log(`🔥 [KataGoEngine] ${id} のウォームアップ完了`);
          } catch (e) {
            console.error(`[KataGoEngine] ウォームアップ失敗: ${id}`, e);
          }
        },
      }) as any,
    [onAnalyzeComplete, onLoadProgress],
  );
  return <div style={{ display: "none" }} />;
}