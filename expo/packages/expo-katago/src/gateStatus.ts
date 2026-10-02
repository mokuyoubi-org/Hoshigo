// gateStatus.ts

export type LoadStage = {
  // downloading / warming_up は analyzeBoard.ts の ModelLoadStage 由来
  phase: "downloading" | "warming_up";
  loaded?: number;
  total?: number;
  step?: number;
  totalSteps?: number;
};

export type LoadProgress = { stage: LoadStage };

export type GateStatus =
  | { status: "error"; message: string }
  | {
      status: "loading";
      // loadProgressがnull = Bridge接続待ち（warmupはまだ始まっていない）ときは "connecting"
      phase: "connecting" | "downloading" | "warming_up";
      percent: number | null;
    }
  | { status: "ready" };

function stagePercent(stage: LoadStage): number | null {
  if (stage.phase === "downloading") {
    return stage.total! > 0
      ? Math.min(100, Math.round((stage.loaded! / stage.total!) * 100))
      : null;
  }
  // warming_up はモデルごとの内部ステップ(step/totalSteps)でしかなく、
  // 複数モデル(b10→b18)を跨いだ通しの進捗ではない。そのままだと
  // モデルが切り替わるたびに100%→50%のように%が飛んで見えてしまうため、
  // connecting と同じ「不確定(null)」として扱い、流れ続けるUIに統一する。
  return null;
}

export function getGateStatus(
  engineReady: boolean,
  setupError: string | null | undefined,
  loadProgress: LoadProgress | null,
): GateStatus {
  if (setupError) {
    return { status: "error", message: setupError };
  }

  if (engineReady) {
    return { status: "ready" };
  }

  if (!loadProgress) {
    return { status: "loading", phase: "connecting", percent: null };
  }

  return {
    status: "loading",
    phase: loadProgress.stage.phase,
    percent: stagePercent(loadProgress.stage),
  };
}
