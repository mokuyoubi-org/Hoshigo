/**
 * KataGoGate.tsx
 * 状態（準備中 / エラー / OK）に応じて画面を切り替える門番コンポーネント
 */

import { COLORS } from "@/src/active/constants/colors";
import {
  KataGoEngineProvider,
  useKataGoEngine,
} from "@/src/active/contexts/KataGoEngineContext";
import React, { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

// ------------------------------------------------------------------ //
// Gate の中身（状態を見て画面を切り替えるだけ）
// ------------------------------------------------------------------ //

function KataGoGateInner({ children }: { children: ReactNode }) {
  const { engineReady, setupError } = useKataGoEngine();

  // 1. エラーならエラー画面
  if (setupError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: COLORS.foreground,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: "red",
            marginBottom: 10,
            fontWeight: "bold",
          }}
        >
          failed to prepare katago
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.text }}>{setupError}</Text>
      </View>
    );
  }

  // 2. まだ準備中ならローディング画面
  if (!engineReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.foreground,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 15, fontSize: 14, color: COLORS.text }}>
          preparing AI…
        </Text>
      </View>
    );
  }

  // 3. 準備OKなら本番の画面を表示する
  return <>{children}</>;
}

// ------------------------------------------------------------------ //
// KataGoGate 本体
// ------------------------------------------------------------------ //

export function KataGoGate({ children }: { children: ReactNode }) {
  return (
    <KataGoEngineProvider>
      <KataGoGateInner>{children}</KataGoGateInner>
    </KataGoEngineProvider>
  );
}
