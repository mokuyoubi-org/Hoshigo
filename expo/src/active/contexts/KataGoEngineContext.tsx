// src/active/contexts/KataGoEngineContext.tsx

import KataGoEngine, {
  KataGoEngineRef,
} from "@/src/active/contexts/KataGoEngine";
import { DEFAULT_MODEL_ID } from "@/src/stable/services/web-katrain/modelManager";
import React, { createContext, useContext, useRef, useState } from "react";
import { View } from "react-native";

// ────────────────────────────────────────────────────────────────
// Context の型（使う側はこれだけ見ればOK）
// ────────────────────────────────────────────────────────────────

export type KataGoEngineContextType = {
  engineRef: React.RefObject<KataGoEngineRef | null>;
  engineReady: boolean;
  setupError: string | null;
};

// ────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────

const KataGoEngineContext = createContext<KataGoEngineContextType | null>(null);

export function KataGoEngineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const engineRef = useRef<KataGoEngineRef | null>(null);

  // 1. 準備OKか？
  const [engineReady, setEngineReady] = useState(false);
  // 2. エラーメッセージはあるか？
  const [setupError, setSetupError] = useState<string | null>(null);

  // TF.jsの初期化（onReady）が終わったら自動でウォームアップを始める
  const handleEngineReady = async () => {
    const engine = engineRef.current;
    if (!engine) {
      setSetupError("エンジンの初期化に失敗");
      return;
    }

    const warmupId = DEFAULT_MODEL_ID;
    console.log(`[KataGoContext] ウォームアップ開始: ${warmupId}`);
    try {
      await engine.warmupModel(warmupId);
      setEngineReady(true); // ウォームアップ完了で全体が Ready になる
    } catch (e) {
      setSetupError(String(e));
    }
  };

  return (
    <KataGoEngineContext.Provider
      value={{
        engineRef,
        engineReady,
        setupError,
      }}
    >
      {/* 画面の裏側（非表示）で KataGoEngine を常駐起動させておく場所 */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <KataGoEngine
          ref={engineRef}
          dom={{
            style: { width: 0, height: 0, position: "absolute", opacity: 0 },
          }}
          onReady={handleEngineReady}
          onError={(err) => {
            console.error("[KataGoContext] KataGoEngine エラー:", err);
            setSetupError(err);
          }}
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
