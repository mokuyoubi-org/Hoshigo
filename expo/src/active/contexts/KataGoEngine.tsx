/**
 * @/src/stable/components/KataGoEngine.tsx
 * DOM コンポーネント（'use dom' → WebView 内で webgpu TF.js が動く）。
 */

import {
  AnalyzeBoardArgs,
  AnalyzeResult,
  analyzeBoard,
  loadModel,
} from "@/src/stable/services/web-katrain/analyzeBoard";
import { initTf } from "@/src/stable/services/web-katrain/initTf";
import { ModelId } from "@/src/stable/services/web-katrain/modelManager";
import { useDOMImperativeHandle } from "expo/dom";
import React, { Ref, useEffect, useRef } from "react";
import { View } from "react-native";

// ================================================================
// Ref の型
// ================================================================

export type KataGoEngineRef = {
  analyzeBoard: (args: AnalyzeBoardArgs) => Promise<AnalyzeResult | null>;
  warmupModel: (id: ModelId) => Promise<void>;
};

// ================================================================
// Props 型
// ================================================================

export type Props = {
  ref: Ref<KataGoEngineRef>;
  dom?: import("expo/dom").DOMProps;
  onReady: () => void;
  onError: (message: string) => void;
};

export default function KataGoEngine({ ref, onReady, onError }: Props) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initTf()
      .then(() => {
        console.log("[KataGoEngine] TF.js 初期化完了");
        onReady();
      })
      .catch((e: unknown) => {
        console.error("[KataGoEngine] TF.js 初期化失敗:", e);
        onError(String(e));
      });
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
            return result ?? null;
          } catch (e) {
            console.error("[KataGoEngine] analyzeBoard 実行エラー:", e);
            return null;
          }
        },

        warmupModel: async (id: ModelId): Promise<void> => {
          try {
            await loadModel(id);
            console.log(`[KataGoEngine] ウォームアップ完了: ${id}`);
          } catch (e) {
            console.error(`[KataGoEngine] ウォームアップ失敗: ${id}`, e);
          }
        },
      }) as any,
    [],
  );

  return <View style={{ display: "none" }} />;
}
