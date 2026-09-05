// expo-katago/src/KataGoGate.tsx

import { LoadingScreen } from "./components/LoadingScreen";
import React, { ReactNode } from "react";
import { Text, View } from "react-native";
import { KataGoEngineProvider, useKataGoEngine } from "./KataGoEngineContext";

function stagePercent(stage: {
  phase: string;
  loaded?: number;
  total?: number;
  step?: number;
  totalSteps?: number;
}): number | null {
  if (stage.phase === "downloading") {
    return stage.total! > 0
      ? Math.min(100, Math.round((stage.loaded! / stage.total!) * 100))
      : null;
  }
  return Math.round((stage.step! / stage.totalSteps!) * 100);
}

// loadProgressがnull = Bridge接続待ち（warmupはまだ始まっていない）
// downloading / warming_up は analyzeBoard.ts の ModelLoadStage 由来
function stageLabel(phase: string): string {
  return phase === "downloading" ? "Downloading AI model..." : "Starting AI engine...";
}

function KataGoGateView({ children }: { children: ReactNode }) {
  const { engineReady, setupError, loadProgress } = useKataGoEngine();

  if (setupError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "white" }}>
        <Text style={{ fontSize: 16, color: "orange", marginBottom: 10, fontWeight: "bold" }}>
          failed to prepare katago
        </Text>
        <Text style={{ fontSize: 12, color: "#4e5256" }}>{setupError}</Text>
      </View>
    );
  }

  if (!engineReady) {
    const percent = loadProgress ? stagePercent(loadProgress.stage) : null;
    const label = loadProgress
      ? stageLabel(loadProgress.stage.phase)
      : "Connecting to AI engine...";

    return <LoadingScreen label={label} percent={percent} />;
  }

  return <>{children}</>;
}

export function KataGoGate({ children }: { children: ReactNode }) {
  return (
    <KataGoEngineProvider>
      <KataGoGateView>{children}</KataGoGateView>
    </KataGoEngineProvider>
  );
}