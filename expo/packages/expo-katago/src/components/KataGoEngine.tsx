// packages/expo-katago/src/components/KataGoEngine.tsx

"use dom";

import { useDOMImperativeHandle } from "expo/dom";
import { Ref, useEffect, useRef } from "react";
import { analyzeBoard, loadModel } from "../logics/analyzeBoard";
import { initTf } from "../logics/initTf";
import {
  AnalyzeBoardArgs,
  AnalyzeResultFields,
  AnalyzeResultFor,
  KataGoEngineRef,
  ModelLoadStage,
} from "../types/types";

type DOMProps = {
  matchContents?: boolean;
  androidLayerType?: "none" | "software" | "hardware";
  webviewProps?: Record<string, any>;
  [key: string]: any; // その他のExpo DOMオプションも通るようにしておく外枠
};

type Props = {
  ref: Ref<KataGoEngineRef>;
  dom?: DOMProps;
  onReady: () => void;
  onError: (message: string) => void;
  onAnalyzeComplete?: (result: unknown) => void;
  // モデルの読み込み進捗通知(ダウンロード中/ウォームアップ中の両方を含む)。
  // IndexedDBキャッシュ済みでダウンロードが不要な場合は"downloading"は呼ばれず、
  // いきなり"warming_up"から始まる。
  onLoadProgress?: (event: { stage: ModelLoadStage }) => void;
  // warmupModelが実際に完了した瞬間に呼ばれる。
  // 注意: warmupModel()自体のawaitはbridge越しだと即解決してしまい信用できないため、
  // 「本当に完了したか」はこのコールバック(props経由=本物の往復通信)でのみ判定する。
  onModelReady?: () => void;
  // warmupModelが失敗したとき(ダウンロード失敗など)に呼ばれる。
  // これが無いと、失敗しても画面が「ダウンロード中」のまま止まって見えてしまう。
  onModelError?: (message: string) => void;
};

const toPlainArrays = <T extends object>(result: T): T => {
  const plain = { ...result } as Record<string, unknown>;
  for (const key of ["ownership", "ownershipStdev", "policy"]) {
    const value = plain[key];
    if (value) plain[key] = Array.from(value as ArrayLike<number>);
  }
  return plain as T;
};

export default function KataGoEngine({
  ref,
  onReady,
  onError,
  onAnalyzeComplete,
  onLoadProgress,
  onModelReady,
  onModelError,
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
        analyzeBoard: async <const F extends AnalyzeResultFields>(
          args: AnalyzeBoardArgs & { fields: F },
        ): Promise<AnalyzeResultFor<F> | null> => {
          try {
            const result = await analyzeBoard(args);
            if (!result) {
              onAnalyzeComplete?.(null);
              return null;
            }
            const formattedResult = toPlainArrays(result);
            if (onAnalyzeComplete) onAnalyzeComplete(formattedResult);
            return formattedResult;
          } catch (e) {
            console.error("🌐 [WebView内] analyzeBoard 実行エラー:", e);
            onAnalyzeComplete?.(null);
            return null;
          }
        },
        warmupModel: async (): Promise<void> => {
          try {
            await loadModel((stage) => {
              onLoadProgress?.({ stage });
            });
            console.log(`🔥 [KataGoEngine] ウォームアップ完了`);
            onModelReady?.();
          } catch (e) {
            console.error(`[KataGoEngine] ウォームアップ失敗`, e);
            onModelError?.(String(e));
          }
        },
      }) as any,
    [onAnalyzeComplete, onLoadProgress, onModelReady, onModelError],
  );
  return <div style={{ display: "none" }} />;
}
