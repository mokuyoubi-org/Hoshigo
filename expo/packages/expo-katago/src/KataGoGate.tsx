import React, { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
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
  // warming_up: 2ステップ中の何ステップ目か、を%として使う
  return Math.round((stage.step! / stage.totalSteps!) * 100);
}

function stageLabel(phase: string): string {
  return phase === "downloading" ? "Downloading AI..." : `Booting up...`;
}

function KataGoGateView({ children }: { children: ReactNode }) {
  const { engineReady, setupError, loadProgress } = useKataGoEngine();

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

  if (!engineReady) {
    const percent = loadProgress ? stagePercent(loadProgress.stage) : null;

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
          {loadProgress
            ? stageLabel(loadProgress.stage.phase)
            : "preparing AI…"}
        </Text>

        {/* DLでもウォームアップでも同じ見た目の帯。%が測れない場合だけ帯を省略 */}
        {percent !== null && (
          <View style={{ alignItems: "center", marginTop: 10, gap: 6 }}>
            <View
              style={{
                width: 180,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#e5e9ec",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  backgroundColor: "#b4c9db",
                }}
              />
            </View>
            <Text style={{ fontSize: 12, color: "#4e5256" }}>{percent}%</Text>
          </View>
        )}
      </View>
    );
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
