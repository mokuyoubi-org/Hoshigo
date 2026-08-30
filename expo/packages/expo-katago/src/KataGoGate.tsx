/**
 * KataGoGate.tsx
 * 状態（準備中🟡 / エラー🔴 / OK🔵）に応じて画面を切り替える(KataGoGateView)。
 * 状態を教えてくれるのがKataGoEngineContext。
 */

import React, { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { KataGoEngineProvider, useKataGoEngine } from "./KataGoEngineContext";

// ------------------------------------------------------------------ //
// Gate の中身（状態を見て画面を切り替えるだけ）
// ------------------------------------------------------------------ //

function KataGoGateView({ children }: { children: ReactNode }) {
  const { engineReady, setupError } = useKataGoEngine();
  // 1. 🔴エラーならエラー画面
  if (setupError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "white",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: "orange",
            marginBottom: 10,
            fontWeight: "bold",
          }}
        >
          failed to prepare katago
        </Text>
        <Text style={{ fontSize: 12, color: "#4e5256" }}>{setupError}</Text>
      </View>
    );
  }
  // 2. 🟡まだ準備中ならローディング画面
  if (!engineReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator size="large" color={"#b4c9db"} />
        <Text style={{ marginTop: 15, fontSize: 14, color: "#4e5256" }}>
          preparing AI…
        </Text>
      </View>
    );
  }
  // 3. 🔵準備OKなら本番の画面を表示する
  return <>{children}</>;
}

// ------------------------------------------------------------------ //
// KataGoGate 本体
// ------------------------------------------------------------------ //

export function KataGoGate({ children }: { children: ReactNode }) {
  return (
    <KataGoEngineProvider>
      <KataGoGateView>{children}</KataGoGateView>
    </KataGoEngineProvider>
  );
}
